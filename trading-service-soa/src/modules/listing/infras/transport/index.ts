import express, { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { v7 } from "uuid";
import { AppError, ErrInvalidRequest } from "@share/app-error";
import { config } from "@share/component/config";
import {
  ICommandHandler,
  IQueryHandler,
  Requester,
  UserRole,
} from "@share/interface";
import { MdlFactory } from "@share/interface/service-context";
import { PagingDTOSchema, PagingResponse } from "@share/model/paging";
import {
  sendCreated,
  sendPagingResponse,
  sendOk,
} from "@share/transport/http-server";
import {
  CreateListingCommand,
  GetListingDetailQuery,
  ListListingQuery,
} from "@modules/listing/interface";
import {
  ListingCondDTOSchema,
  ListingResponseDTO,
} from "@modules/listing/model";

/**
 * Listing HTTP transport (adapter).
 * Follows sample/brand's CQRS pattern: handlers injected individually.
 * Controller contains NO business logic (RULE-008).
 */
export class ListingHTTPService {
  constructor(
    private readonly createCmdHandler: ICommandHandler<
      CreateListingCommand,
      ListingResponseDTO
    >,
    private readonly getDetailQueryHandler: IQueryHandler<
      GetListingDetailQuery,
      ListingResponseDTO
    >,
    private readonly listQueryHandler: IQueryHandler<
      ListListingQuery,
      PagingResponse<ListingResponseDTO>
    >,
  ) {}

  /**
   * POST /api/v1/listings
   * Auth: Bearer JWT, Role: FARMER
   *
   * BA-SOA §7: farmerId from JWT sub, NOT from body (BR-TS-001).
   */
  async createListingAPI(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = res.locals.requester as Requester;
      const cmd: CreateListingCommand = {
        farmerId: requester.sub,
        dto: req.body,
      };
      const result = await this.createCmdHandler.execute(cmd);
      sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/listings/:listingId
   */
  async getListingAPI(req: Request, res: Response, next: NextFunction) {
    try {
      const listingId = Array.isArray(req.params.listingId)
        ? req.params.listingId[0]
        : req.params.listingId;
      if (!listingId) {
        throw AppError.from(ErrInvalidRequest, 400)
          .withCode("VALIDATION_ERROR")
          .withLog("listingId is required");
      }
      const result = await this.getDetailQueryHandler.query({ listingId });
      sendOk(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/listings
   * BA-SOA: page=0, size=20, max 100; sort by GPS distance then listingId.
   */
  async listListingsAPI(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse paging
      const pagingResult = PagingDTOSchema.safeParse(req.query);
      if (!pagingResult.success) {
        throw AppError.from(ErrInvalidRequest, 400)
          .withCode("VALIDATION_ERROR")
          .withLog("Invalid paging parameters");
      }

      // Parse filter conditions
      const condResult = ListingCondDTOSchema.safeParse(req.query);
      const cond = condResult.success ? condResult.data : {};

      const result = await this.listQueryHandler.query({
        cond,
        paging: pagingResult.data,
      });
      sendPagingResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/listings/upload
   * Auth: Bearer JWT, Role: FARMER
   * Accepts multipart/form-data field `images` (1..5 files, max 5 MiB each, JPEG/PNG/WebP).
   */
  async uploadImagesAPI(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = res.locals.requester as Requester;
      const contentType = req.headers["content-type"] || "";
      if (!contentType.toLowerCase().includes("multipart/form-data")) {
        throw AppError.from(ErrInvalidRequest, 400)
          .withCode("VALIDATION_ERROR")
          .withLog("multipart/form-data is required");
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw AppError.from(ErrInvalidRequest, 400)
          .withCode("VALIDATION_ERROR")
          .withLog("Upload body is empty");
      }

      const parts = parseMultipartFormData(req.body, contentType);
      let fileParts = parts.filter((part) => part.fieldName === "images");
      if (fileParts.length === 0) {
        fileParts = parts.filter((part) => part.fieldName === "file");
      }

      if (fileParts.length === 0 || fileParts.length > 5) {
        throw AppError.from(ErrInvalidRequest, 400)
          .withCode("VALIDATION_ERROR")
          .withLog("Between 1 and 5 image files are required");
      }

      const mediaDir = config.media.dir;
      await fs.promises.mkdir(mediaDir, { recursive: true });
      const baseGatewayUrl = config.media.publicGatewayUrl.replace(/\/$/, "");
      const maxFileBytes = 5 * 1024 * 1024;
      const urls: string[] = [];

      for (const filePart of fileParts) {
        const buf = filePart.data;
        if (buf.length === 0 || buf.length > maxFileBytes) {
          throw AppError.from(ErrInvalidRequest, 400)
            .withCode("VALIDATION_ERROR")
            .withLog("Each image file must be non-empty and <= 5 MiB");
        }
        const detectedType = detectImageMimeType(buf);
        if (!detectedType) {
          throw AppError.from(ErrInvalidRequest, 400)
            .withCode("VALIDATION_ERROR")
            .withLog("Unsupported image format; allowed formats: JPEG, PNG, WebP");
        }

        const mediaId = v7();
        const filePath = path.join(mediaDir, mediaId);
        const metaPath = path.join(mediaDir, `${mediaId}.meta.json`);
        await fs.promises.writeFile(filePath, buf);
        await fs.promises.writeFile(
          metaPath,
          JSON.stringify({
            contentType: detectedType,
            sizeBytes: buf.length,
            uploadedBy: requester.sub,
            createdAt: new Date().toISOString(),
          }),
        );
        urls.push(`${baseGatewayUrl}/api/v1/listings/media/${mediaId}`);
      }

      res.status(201).json({
        data: {
          urls,
          count: urls.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/listings/media/:mediaId
   * Public image read so <img src> works without Authorization headers.
   */
  async getListingMediaAPI(req: Request, res: Response, next: NextFunction) {
    try {
      const mediaId = Array.isArray(req.params.mediaId)
        ? req.params.mediaId[0]
        : req.params.mediaId;
      if (
        !mediaId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId)
      ) {
        throw AppError.from(ErrInvalidRequest, 404)
          .withCode("NOT_FOUND")
          .withLog("Media not found");
      }

      const filePath = path.join(config.media.dir, mediaId);
      const metaPath = path.join(config.media.dir, `${mediaId}.meta.json`);
      let buf: Buffer;
      try {
        buf = await fs.promises.readFile(filePath);
      } catch (err: any) {
        if (err?.code === "ENOENT") {
          throw AppError.from(ErrInvalidRequest, 404)
            .withCode("NOT_FOUND")
            .withLog("Media not found");
        }
        throw err;
      }

      let contentType = detectImageMimeType(buf) || "application/octet-stream";
      try {
        const metaRaw = await fs.promises.readFile(metaPath, "utf8");
        const meta = JSON.parse(metaRaw);
        if (typeof meta?.contentType === "string" && meta.contentType.startsWith("image/")) {
          contentType = meta.contentType;
        }
      } catch {
        // Fallback to detected magic bytes
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.status(200).send(buf);
    } catch (error) {
      next(error);
    }
  }
}

interface ParsedMultipartPart {
  fieldName: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
}

export function parseMultipartFormData(
  body: Buffer,
  contentTypeHeader: string,
): ParsedMultipartPart[] {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentTypeHeader);
  if (!boundaryMatch) {
    throw AppError.from(ErrInvalidRequest, 400)
      .withCode("VALIDATION_ERROR")
      .withLog("Missing multipart boundary");
  }
  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const delimiter = Buffer.from(`--${boundary}`);
  const headerEndMarker = Buffer.from("\r\n\r\n");
  const parts: ParsedMultipartPart[] = [];

  let pos = body.indexOf(delimiter);
  while (pos !== -1) {
    let start = pos + delimiter.length;
    if (body.subarray(start, start + 2).equals(Buffer.from("--"))) {
      break;
    }
    if (body.subarray(start, start + 2).equals(Buffer.from("\r\n"))) {
      start += 2;
    }
    const nextPos = body.indexOf(delimiter, start);
    if (nextPos === -1) break;

    let partEnd = nextPos;
    if (partEnd >= start + 2 && body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) {
      partEnd -= 2;
    }

    const headerSep = body.indexOf(headerEndMarker, start);
    if (headerSep !== -1 && headerSep < partEnd) {
      const headersText = body.subarray(start, headerSep).toString("utf8");
      const data = body.subarray(headerSep + 4, partEnd);
      const lines = headersText.split(/\r?\n/);
      const dispLine = lines.find((line) => /^content-disposition:/i.test(line));
      const ctLine = lines.find((line) => /^content-type:/i.test(line));
      if (dispLine) {
        const nameMatch = /(?:^|;\s*)name=(?:"([^"]+)"|([^;\s]+))/i.exec(dispLine);
        const fileMatch = /(?:^|;\s*)filename=(?:"([^"]*)"|([^;\s]+))/i.exec(dispLine);
        const fieldName = nameMatch ? (nameMatch[1] ?? nameMatch[2]) : "";
        const filename = fileMatch ? (fileMatch[1] ?? fileMatch[2]) : undefined;
        const partContentType = ctLine ? ctLine.replace(/^content-type:\s*/i, "").trim() : undefined;
        if (fieldName) {
          parts.push({ fieldName, filename, contentType: partContentType, data });
        }
      }
    }
    pos = nextPos;
  }

  return parts;
}

function detectImageMimeType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Wire listing routes — follows sample's setupXxxHexagon pattern.
 */
export function setupListingRoutes(
  httpService: ListingHTTPService,
  mdlFactory: MdlFactory,
): Router {
  const router = Router();

  const farmerOnly = mdlFactory.allowRoles([UserRole.FARMER]);

  // POST /api/v1/listings/upload — FARMER only (must precede /listings/:listingId)
  router.post(
    "/listings/upload",
    mdlFactory.auth,
    farmerOnly,
    express.raw({ type: "multipart/form-data", limit: "6mb" }),
    httpService.uploadImagesAPI.bind(httpService),
  );

  // GET /api/v1/listings/media/:mediaId — public image serve (must precede /listings/:listingId)
  router.get(
    "/listings/media/:mediaId",
    httpService.getListingMediaAPI.bind(httpService),
  );

  // POST /api/v1/listings — FARMER only
  router.post(
    "/listings",
    mdlFactory.auth,
    farmerOnly,
    httpService.createListingAPI.bind(httpService),
  );

  // GET /api/v1/listings — any authenticated user
  router.get(
    "/listings",
    mdlFactory.auth,
    httpService.listListingsAPI.bind(httpService),
  );

  // GET /api/v1/listings/:listingId — any authenticated user
  router.get(
    "/listings/:listingId",
    mdlFactory.auth,
    httpService.getListingAPI.bind(httpService),
  );

  return router;
}

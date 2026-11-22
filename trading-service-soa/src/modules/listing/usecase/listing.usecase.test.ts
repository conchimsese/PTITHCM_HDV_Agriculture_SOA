import test, { describe, it } from "node:test";
import assert from "node:assert";
import {
  CreateNewListingCmdHandler,
  GetListingDetailQueryHandler,
  ListingUseCase,
  ListListingQueryHandler,
} from "./index";
import { IListingRepository, IFarmingRpc } from "../interface";
import {
  CreateListingDTO,
  DepositCommitResult,
  FarmingSnapshotDTO,
  Listing,
  ListingCondDTO,
  ListingStatus,
} from "../model";
import { PagingDTO } from "@share/model/paging";
import { AppError } from "@share/app-error";
import { parseMultipartFormData } from "../infras/transport";

class MockListingRepository implements IListingRepository {
  public listings: Listing[] = [];

  async insert(listing: Listing): Promise<void> {
    this.listings.push(listing);
  }

  async getById(listingId: string): Promise<Listing | null> {
    return this.listings.find((l) => l.listingId === listingId) || null;
  }

  async list(cond: ListingCondDTO, paging: PagingDTO): Promise<{ items: Listing[]; total: number }> {
    let filtered = [...this.listings];
    if (cond.farmerId) {
      filtered = filtered.filter((l) => l.farmerId === cond.farmerId);
    }
    return {
      items: filtered.slice(paging.page * paging.size, (paging.page + 1) * paging.size),
      total: filtered.length,
    };
  }

  async tryCommitDeposit(
    _offerId: string,
    _contractId: string,
    _paymentTrackingId: string,
    _depositAmount: string,
  ): Promise<DepositCommitResult | "already_committed"> {
    return "already_committed";
  }

  async getCommitResult(_listingId: string): Promise<DepositCommitResult | null> {
    return null;
  }

  async markSold(listingId: string, winningContractId: string): Promise<boolean> {
    const listing = this.listings.find((l) => l.listingId === listingId);
    if (listing && listing.winningContractId === winningContractId && listing.status === ListingStatus.LOCKED) {
      listing.status = ListingStatus.SOLD;
      return true;
    }
    return false;
  }
}

class MockFarmingRpc implements IFarmingRpc {
  public snapshotToReturn: FarmingSnapshotDTO | null = null;
  public shouldFailWith: Error | null = null;

  async getPlotSummary(_plotId: string, _cropSeasonId: string): Promise<FarmingSnapshotDTO> {
    if (this.shouldFailWith) {
      throw this.shouldFailWith;
    }
    if (!this.snapshotToReturn) {
      throw new Error("No mock snapshot provided");
    }
    return this.snapshotToReturn;
  }
}

describe("ListingUseCase", () => {
  const farmerId = "11111111-1111-1111-1111-111111111111";
  const plotId = "22222222-2222-2222-2222-222222222222";
  const cropSeasonId = "33333333-3333-3333-3333-333333333333";

  it("successfully creates a listing mapped from Farming snapshot", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    farming.snapshotToReturn = {
      plotId,
      farmerId,
      area: 2.5,
      latitude: 10.762622,
      longitude: 106.660172,
      currentSeason: {
        cropSeasonId,
        cropType: "ST25 Rice",
        expectedYield: 15.5,
      },
    };

    const useCase = new ListingUseCase(repo, farming);
    const dto: CreateListingDTO = {
      plotId,
      cropSeasonId,
      expectedPrice: "4600000.00",
    };

    const result = await useCase.createListing(farmerId, dto);

    assert.strictEqual(result.farmerId, farmerId);
    assert.strictEqual(result.plotId, plotId);
    assert.strictEqual(result.cropSeasonId, cropSeasonId);
    assert.strictEqual(result.seedType, "ST25 Rice");
    assert.strictEqual(result.estimatedYield, 15.5);
    assert.strictEqual(result.area, 2.5);
    assert.strictEqual(result.latitude, 10.762622);
    assert.strictEqual(result.longitude, 106.660172);
    assert.strictEqual(result.expectedPrice, "4600000.00");
    assert.strictEqual(result.status, ListingStatus.OPEN);
    assert.strictEqual(repo.listings.length, 1);
  });

  it("throws 403 FORBIDDEN if caller farmer does not own the plot (BR-TS-001)", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    farming.snapshotToReturn = {
      plotId,
      farmerId: "99999999-9999-9999-9999-999999999999", // Different farmer
      area: 2.5,
      latitude: 10.762622,
      longitude: 106.660172,
      currentSeason: {
        cropSeasonId,
        cropType: "ST25 Rice",
        expectedYield: 15.5,
      },
    };

    const useCase = new ListingUseCase(repo, farming);
    const dto: CreateListingDTO = {
      plotId,
      cropSeasonId,
      expectedPrice: "4600000.00",
    };

    await assert.rejects(
      async () => {
        await useCase.createListing(farmerId, dto);
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.strictEqual(err.getStatusCode(), 403);
        assert.strictEqual(err.getCode(), "FORBIDDEN");
        return true;
      }
    );
  });

  it("throws 409 SNAPSHOT_INCOMPLETE if required snapshot fields are missing (BR-TS-003)", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    farming.snapshotToReturn = {
      plotId,
      farmerId,
      area: 2.5,
      latitude: null as any, // missing GPS
      longitude: 106.660172,
      currentSeason: {
        cropSeasonId,
        cropType: "ST25 Rice",
        expectedYield: 15.5,
      },
    };

    const useCase = new ListingUseCase(repo, farming);
    const dto: CreateListingDTO = {
      plotId,
      cropSeasonId,
      expectedPrice: "4600000.00",
    };

    await assert.rejects(
      async () => {
        await useCase.createListing(farmerId, dto);
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.strictEqual(err.getStatusCode(), 409);
        assert.strictEqual(err.getCode(), "SNAPSHOT_INCOMPLETE");
        return true;
      }
    );
  });

  it("throws 404 NOT_FOUND when getting non-existent listing", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    const useCase = new ListingUseCase(repo, farming);

    await assert.rejects(
      async () => {
        await useCase.getListing("00000000-0000-0000-0000-000000000000");
      },
      (err: any) => {
        assert(err instanceof AppError);
        assert.strictEqual(err.getStatusCode(), 404);
        assert.strictEqual(err.getCode(), "NOT_FOUND");
        return true;
      }
    );
  });

  it("individual handlers execute commands and queries correctly (sample/brand pattern)", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    farming.snapshotToReturn = {
      plotId,
      farmerId,
      area: 3.0,
      latitude: 10.5,
      longitude: 106.5,
      currentSeason: {
        cropSeasonId,
        cropType: "Jasmine Rice",
        expectedYield: 20.0,
      },
    };

    const createHandler = new CreateNewListingCmdHandler(repo, farming);
    const getHandler = new GetListingDetailQueryHandler(repo);
    const listHandler = new ListListingQueryHandler(repo);

    // 1. Create handler
    const created = await createHandler.execute({
      farmerId,
      dto: {
        plotId,
        cropSeasonId,
        expectedPrice: "5000000.00",
      },
    });
    assert.strictEqual(created.seedType, "Jasmine Rice");
    assert.strictEqual(created.expectedPrice, "5000000.00");

    // 2. Get handler
    const detail = await getHandler.query({ listingId: created.listingId });
    assert.strictEqual(detail.listingId, created.listingId);

    // 3. List handler
    const listResult = await listHandler.query({
      cond: { farmerId },
      paging: { page: 0, size: 10 },
    });
    assert.strictEqual(listResult.items.length, 1);
    assert.strictEqual(listResult.totalElements, 1);
  });

  it("supports optional images and canonical 2-decimal expectedPrice formatting", async () => {
    const repo = new MockListingRepository();
    const farming = new MockFarmingRpc();
    farming.snapshotToReturn = {
      plotId,
      farmerId,
      area: 2.0,
      latitude: 10.1,
      longitude: 105.9,
      currentSeason: {
        cropSeasonId,
        cropType: "OM18 Rice",
        expectedYield: 12.0,
      },
    };
    const useCase = new ListingUseCase(repo, farming);
    const created = await useCase.createListing(farmerId, {
      plotId,
      cropSeasonId,
      expectedPrice: "4600000",
      images: ["http://localhost:8080/api/v1/listings/media/01950123-4567-789a-bcde-0123456789ab"],
    });
    assert.strictEqual(created.expectedPrice, "4600000.00");
    assert.deepStrictEqual(created.images, [
      "http://localhost:8080/api/v1/listings/media/01950123-4567-789a-bcde-0123456789ab",
    ]);
  });

  it("parses multipart/form-data with quoted and unquoted boundary/disposition headers", () => {
    const boundary = "abc-123";
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: image/png\r\nContent-Disposition: form-data; name=images; filename=a.png\r\n\r\n`),
      pngHeader,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const parts = parseMultipartFormData(
      payload,
      `multipart/form-data; boundary="${boundary}"`,
    );
    assert.strictEqual(parts.length, 1);
    assert.strictEqual(parts[0].fieldName, "images");
    assert.deepStrictEqual(parts[0].data, pngHeader);
  });
});


import { AppError } from "@share/app-error";
import { ICommandHandler } from "@share/interface";
import { IOfferRepository, RejectOfferCommand } from "../interface";
import {
  Offer,
  OfferResponseDTO,
  OfferStatus,
  toOfferResponseDTO,
} from "../model";
import {
  ErrNotListingOwner,
  ErrOfferNotFound,
  ErrOfferNotPending,
} from "../model/error";

/**
 * Reject offer command handler.
 * Only the FARMER who owns the listing can reject a PENDING offer.
 */
export class RejectOfferCmdHandler
  implements ICommandHandler<RejectOfferCommand, OfferResponseDTO>
{
  constructor(private readonly offerRepository: IOfferRepository) {}

  async execute(command: RejectOfferCommand): Promise<OfferResponseDTO> {
    const { farmerId, offerId } = command;

    const offer = await this.offerRepository.getById(offerId);
    if (!offer) {
      throw AppError.from(ErrOfferNotFound, 404).withCode("NOT_FOUND");
    }

    if (offer.farmerId !== farmerId) {
      throw AppError.from(ErrNotListingOwner, 403).withCode("FORBIDDEN");
    }

    if (offer.status === OfferStatus.REJECTED) {
      return toOfferResponseDTO(offer);
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw AppError.from(ErrOfferNotPending, 400).withCode(
        "INVALID_STATE_TRANSITION",
      );
    }

    await this.offerRepository.updateStatus(offerId, OfferStatus.REJECTED);

    const updatedOffer: Offer = {
      ...offer,
      status: OfferStatus.REJECTED,
      updatedAt: new Date(),
    };
    return toOfferResponseDTO(updatedOffer);
  }
}

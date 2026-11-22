import { AppError } from "@share/app-error";
import { ICommandHandler } from "@share/interface";
import { CancelOfferCommand, IOfferRepository } from "../interface";
import {
  Offer,
  OfferResponseDTO,
  OfferStatus,
  toOfferResponseDTO,
} from "../model";
import {
  ErrNotOfferCreator,
  ErrOfferNotFound,
  ErrOfferNotPending,
} from "../model/error";

/**
 * Cancel offer command handler.
 * Only the TRADER who submitted the offer can cancel a PENDING offer.
 */
export class CancelOfferCmdHandler
  implements ICommandHandler<CancelOfferCommand, OfferResponseDTO>
{
  constructor(private readonly offerRepository: IOfferRepository) {}

  async execute(command: CancelOfferCommand): Promise<OfferResponseDTO> {
    const { traderId, offerId } = command;

    const offer = await this.offerRepository.getById(offerId);
    if (!offer) {
      throw AppError.from(ErrOfferNotFound, 404).withCode("NOT_FOUND");
    }

    if (offer.traderId !== traderId) {
      throw AppError.from(ErrNotOfferCreator, 403).withCode("FORBIDDEN");
    }

    if (offer.status === OfferStatus.CANCELLED) {
      return toOfferResponseDTO(offer);
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw AppError.from(ErrOfferNotPending, 400).withCode(
        "INVALID_STATE_TRANSITION",
      );
    }

    await this.offerRepository.updateStatus(offerId, OfferStatus.CANCELLED);

    const updatedOffer: Offer = {
      ...offer,
      status: OfferStatus.CANCELLED,
      updatedAt: new Date(),
    };
    return toOfferResponseDTO(updatedOffer);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubmitKycDto } from './dto';

/** Image kinds an applicant can attach, in display order. */
const KINDS = ['front', 'back', 'selfie'] as const;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export interface KycStatusDto {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  fullName: string | null;
  documentType: string | null;
  countryCode: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  /** Whether the user may submit (or re-submit) right now. */
  canSubmit: boolean;
}

/**
 * In-house manual KYC (SPEC §6 / §9b.4).
 *
 * The client requires KYC but has not chosen a provider, so this reviews
 * documents in the admin panel instead of calling Sumsub/Onfido. Documents
 * live in the database as base64 — acceptable for manual review at this
 * scale, but a real deployment should move them to object storage.
 */
@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's own status. Never returns document payloads. */
  async mine(userId: string): Promise<KycStatusDto> {
    const rec = await this.prisma.kycRecord.findUnique({ where: { userId } });
    const status = (rec?.status ?? 'NONE') as KycStatusDto['status'];
    return {
      status,
      fullName: rec?.fullName ?? null,
      documentType: rec?.documentType ?? null,
      countryCode: rec?.countryCode ?? null,
      submittedAt: rec?.submittedAt ?? null,
      reviewedAt: rec?.reviewedAt ?? null,
      reviewerNote: rec?.reviewerNote ?? null,
      // Re-submission is allowed after a rejection; a pending or approved
      // record is left alone.
      canSubmit: status === 'NONE' || status === 'REJECTED',
    };
  }

  async submit(userId: string, dto: SubmitKycDto): Promise<KycStatusDto> {
    const existing = await this.prisma.kycRecord.findUnique({
      where: { userId },
    });
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('Your documents are already under review.');
    }
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('Your identity is already verified.');
    }

    const images = [
      { kind: 'front' as const, img: dto.front },
      { kind: 'back' as const, img: dto.back },
      { kind: 'selfie' as const, img: dto.selfie },
    ].filter((x): x is { kind: (typeof KINDS)[number]; img: NonNullable<typeof x.img> } =>
      Boolean(x.img),
    );

    for (const { img } of images) {
      if (!ALLOWED_MIME.includes(img.mimeType)) {
        throw new BadRequestException(
          'Only JPEG, PNG or WebP images are accepted.',
        );
      }
    }

    const common = {
      status: 'PENDING' as const,
      provider: 'manual',
      fullName: dto.fullName.trim(),
      documentType: dto.documentType,
      documentNumber: dto.documentNumber.trim(),
      countryCode: dto.countryCode.toUpperCase(),
      submittedAt: new Date(),
      reviewedAt: null,
      reviewerNote: null,
    };

    const record = await this.prisma.kycRecord.upsert({
      where: { userId },
      update: common,
      create: { userId, ...common },
    });

    // A re-submission replaces the previous documents outright, so a
    // rejected applicant's stale images don't linger next to the new ones.
    await this.prisma.$transaction([
      this.prisma.kycDocument.deleteMany({ where: { recordId: record.id } }),
      this.prisma.kycDocument.createMany({
        data: images.map(({ kind, img }) => ({
          recordId: record.id,
          kind,
          mimeType: img.mimeType,
          data: img.data,
        })),
      }),
    ]);

    return this.mine(userId);
  }

  // ───────────────────── Admin review ─────────────────────

  /** Review queue. Deliberately excludes image payloads. */
  async adminList(status?: string) {
    const rows = await this.prisma.kycRecord.findMany({
      where: status ? { status: status as never } : { NOT: { status: 'NONE' } },
      orderBy: { submittedAt: 'asc' },
      take: 200,
      include: {
        user: { select: { email: true, countryCode: true, isBlocked: true } },
        _count: { select: { documents: true } },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      userEmail: r.user.email,
      isBlocked: r.user.isBlocked,
      status: r.status,
      fullName: r.fullName,
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      countryCode: r.countryCode,
      documentCount: r._count.documents,
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt,
      reviewerNote: r.reviewerNote,
    }));
  }

  /** Full applicant view — the only place image payloads are returned. */
  async adminDetail(userId: string) {
    const r = await this.prisma.kycRecord.findUniqueOrThrow({
      where: { userId },
      include: {
        user: { select: { email: true, countryCode: true, createdAt: true } },
        documents: true,
      },
    });
    const order = new Map<string, number>(KINDS.map((k, i) => [k, i]));
    return {
      userId: r.userId,
      userEmail: r.user.email,
      status: r.status,
      fullName: r.fullName,
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      countryCode: r.countryCode,
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt,
      reviewerNote: r.reviewerNote,
      documents: r.documents
        .sort((a, b) => (order.get(a.kind) ?? 9) - (order.get(b.kind) ?? 9))
        .map((d) => ({
          id: d.id,
          kind: d.kind,
          // Ready to drop straight into an <img src>.
          dataUrl: `data:${d.mimeType};base64,${d.data}`,
        })),
    };
  }

  async decide(userId: string, approve: boolean, note?: string) {
    const rec = await this.prisma.kycRecord.findUniqueOrThrow({
      where: { userId },
    });
    if (rec.status !== 'PENDING') {
      throw new BadRequestException(
        `This application is already ${rec.status}.`,
      );
    }
    const updated = await this.prisma.kycRecord.update({
      where: { userId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewerNote: note,
      },
      select: { userId: true, status: true, reviewedAt: true },
    });

    // Rejected documents are of no further use and are identity data, so
    // they are dropped rather than kept around indefinitely.
    if (!approve) {
      await this.prisma.kycDocument.deleteMany({
        where: { recordId: rec.id },
      });
    }
    return updated;
  }
}

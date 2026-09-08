import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PrismaWriteErrorContext {
  entityName: string;
  duplicateMessage?: string;
  notFoundMessage?: string;
  fallbackMessage?: string;
}

export function mapPrismaWriteError(
  error: unknown,
  context: PrismaWriteErrorContext,
): never {
  const prismaCode =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : null;

  if (prismaCode) {
    if (prismaCode === 'P2002') {
      throw new ConflictException(
        context.duplicateMessage ?? `${context.entityName} already exists`,
      );
    }

    if (prismaCode === 'P2025') {
      throw new NotFoundException(
        context.notFoundMessage ?? `${context.entityName} not found`,
      );
    }

    throw new InternalServerErrorException(
      context.fallbackMessage ?? `${context.entityName} write failed (${prismaCode})`,
    );
  }

  if (error instanceof NotFoundException || error instanceof ConflictException) {
    throw error;
  }

  throw new InternalServerErrorException(
    context.fallbackMessage ?? `${context.entityName} write failed`,
  );
}
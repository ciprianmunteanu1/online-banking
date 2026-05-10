import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditSeverity } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(
        userId: string | null,
        action: string,
        details?: Record<string, any>,
        severity: AuditSeverity = 'LOW',
        ipAddress?: string,
    ) {
        return this.prisma.auditLog.create({
            data: {
                userId,
                action,
                details: details as any,
                severity,
                ipAddress,
            },
        });
    }

    async getAuditLogs(
        page = 1,
        limit = 50,
        filters?: {
            severity?: AuditSeverity;
            userId?: string;
            from?: Date;
            to?: Date;
        },
    ) {
        const where: any = {};

        if (filters?.severity) where.severity = filters.severity;
        if (filters?.userId) where.userId = filters.userId;
        if (filters?.from || filters?.to) {
            where.createdAt = {};
            if (filters?.from) where.createdAt.gte = filters.from;
            if (filters?.to) where.createdAt.lte = filters.to;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { email: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}

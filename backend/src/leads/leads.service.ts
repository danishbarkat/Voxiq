import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

interface CsvRow {
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    [key: string]: any;
}

@Injectable()
export class LeadsService {
    private readonly logger = new Logger(LeadsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Import leads from CSV file
     */
    async importCsv(
        file: Express.Multer.File,
        accountId: string,
        listId?: string,
        newListName?: string,
    ): Promise<{ imported: number; duplicates: number; errors: number }> {
        // 1. Resolve or create list
        let targetListId = listId;

        if (newListName) {
            this.logger.log(`Creating new list: ${newListName} for account ${accountId}`);
            const newList = await this.prisma.list.create({
                data: {
                    name: newListName,
                    accountId: accountId,
                },
            });
            targetListId = newList.id;
        }

        if (!targetListId) {
            throw new BadRequestException('No list specified or created');
        }

        this.logger.log(`Starting CSV import for list ${targetListId}`);

        const leads: CreateLeadDto[] = [];
        const errors: string[] = [];

        // Parse CSV
        await new Promise((resolve, reject) => {
            const stream = Readable.from(file.buffer);

            stream
                .pipe(csvParser())
                .on('data', (row: CsvRow) => {
                    try {
                        const lead = this.parseCsvRow(row, targetListId, accountId);
                        if (lead) {
                            leads.push(lead);
                        }
                    } catch (error) {
                        errors.push(`Error parsing row: ${error.message}`);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        this.logger.log(`Parsed ${leads.length} leads from CSV`);

        // Deduplicate
        const { unique, duplicates } = await this.deduplicateLeads(leads, accountId);

        // Bulk create
        let imported = 0;
        const batchSize = 100;

        for (let i = 0; i < unique.length; i += batchSize) {
            const batch = unique.slice(i, i + batchSize);

            try {
                await this.prisma.lead.createMany({
                    data: batch.map((lead) => ({
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        phone: lead.phone,
                        address: lead.address,
                        tags: lead.tags || [],
                        customFields: lead.customFields || {},
                        status: lead.status || LeadStatus.NEW,
                        listId: lead.listId,
                        accountId: lead.accountId,
                    })),
                    skipDuplicates: true,
                });

                imported += batch.length;
            } catch (error) {
                this.logger.error(`Error importing batch: ${error.message}`);
            }
        }

        this.logger.log(
            `Import complete: ${imported} imported, ${duplicates} duplicates, ${errors.length} errors`,
        );

        return {
            imported,
            duplicates,
            errors: errors.length,
        };
    }

    /**
     * Parse CSV row into lead DTO
     */
    private parseCsvRow(
        row: CsvRow,
        listId: string,
        accountId: string,
    ): CreateLeadDto | null {
        // Normalize keys for case-insensitive matching
        const normalizedRow: Record<string, any> = {};
        for (const key in row) {
            normalizedRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
        }

        // Handle different column name formats using normalized keys
        const firstName = normalizedRow.firstname || normalizedRow.fname || normalizedRow.name || '';
        const lastName = normalizedRow.lastname || normalizedRow.lname || '';
        const phone = normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.mobile || normalizedRow.contact || '';

        if (!phone) {
            this.logger.warn(`Skipping row: No phone number found in columns: ${Object.keys(row).join(', ')}`);
            throw new Error('Phone number is required');
        }

        // Normalize phone number (remove non-digits)
        const normalizedPhone = phone.toString().replace(/\D/g, '');

        if (normalizedPhone.length < 10) {
            this.logger.warn(`Skipping row: Invalid phone number length (${normalizedPhone.length}): ${normalizedPhone}`);
            throw new Error('Invalid phone number (must be at least 10 digits)');
        }

        // Extract custom fields (any column not in standard fields)
        const standardFieldsNormalized = ['firstname', 'fname', 'name', 'lastname', 'lname', 'phone', 'phonenumber', 'mobile', 'contact', 'address', 'tags'];
        const customFields: Record<string, any> = {};

        for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!standardFieldsNormalized.includes(normalizedKey) && value) {
                customFields[key] = value;
            }
        }

        return {
            firstName,
            lastName,
            phone: normalizedPhone,
            address: row.address || normalizedRow.address || '',
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
            customFields,
            listId,
            accountId,
            status: LeadStatus.NEW,
        };
    }

    /**
     * Deduplicate leads by phone number
     */
    private async deduplicateLeads(
        leads: CreateLeadDto[],
        accountId: string,
    ): Promise<{ unique: CreateLeadDto[]; duplicates: number }> {
        const phoneNumbers = leads.map((l) => l.phone);

        // Check existing leads in database
        const existingLeads = await this.prisma.lead.findMany({
            where: {
                accountId,
                phone: { in: phoneNumbers },
            },
            select: { phone: true },
        });

        const existingPhones = new Set(existingLeads.map((l) => l.phone));

        // Filter out duplicates within the CSV itself
        const seenPhones = new Set<string>();
        const unique: CreateLeadDto[] = [];
        let duplicates = 0;

        for (const lead of leads) {
            if (!seenPhones.has(lead.phone) && !existingPhones.has(lead.phone)) {
                seenPhones.add(lead.phone);
                unique.push(lead);
            } else {
                duplicates++;
            }
        }

        return { unique, duplicates };
    }

    /**
     * Create a single lead
     */
    async create(createLeadDto: CreateLeadDto) {
        return this.prisma.lead.create({
            data: {
                firstName: createLeadDto.firstName,
                lastName: createLeadDto.lastName,
                phone: createLeadDto.phone,
                address: createLeadDto.address,
                tags: createLeadDto.tags || [],
                customFields: createLeadDto.customFields || {},
                status: createLeadDto.status || LeadStatus.NEW,
                listId: createLeadDto.listId,
                accountId: createLeadDto.accountId,
            },
        });
    }

    /**
     * Find all leads with filters
     */
    async findAll(filters?: {
        accountId?: string;
        listId?: string;
        status?: LeadStatus;
        agentId?: string;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};

        if (filters?.accountId) where.accountId = filters.accountId;
        if (filters?.listId) where.listId = filters.listId;
        if (filters?.status) where.status = filters.status;

        // Filter by agent's assigned lists
        if (filters?.agentId) {
            const agentLists = await this.prisma.agentList.findMany({
                where: { agentId: filters.agentId },
                select: { listId: true },
            });
            const assignedListIds = agentLists.map(al => al.listId);
            // If agent has no lists assigned, return empty (don't show all leads)
            if (assignedListIds.length === 0) return [];
            where.listId = { in: assignedListIds };
        }

        // Priority ordering: NEW first, then CALLBACK, then NO_ANSWER, then CONTACTED (from previous days)
        // DNC and BOOKED are excluded from the calling queue view
        const statusOrder = {
            'NEW': 0,
            'CALLBACK': 1,
            'NO_ANSWER': 2,
            'UNREACHABLE': 2.5, // Between No Answer and Contacted
            'CONTACTED': 3,
        };

        const leads = await this.prisma.lead.findMany({
            where,
            take: filters?.limit || 500,
            skip: filters?.offset || 0,
            orderBy: [
                // Within same status, order by updatedAt ascending (oldest first = bottom of daily contacted)
                { updatedAt: 'asc' },
                { createdAt: 'asc' },
            ],
            include: {
                list: true,
                callLogs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        // Sort in memory: NEW/CALLBACK/NO_ANSWER first, CONTACTED from previous days last
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return leads.sort((a, b) => {
            const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 10;
            const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 10;

            // If same status group, sort by updatedAt (oldest first)
            if (aOrder !== bOrder) return aOrder - bOrder;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });
    }

    /**
     * Find one lead
     */
    async findOne(id: string) {
        return this.prisma.lead.findUnique({
            where: { id },
            include: {
                list: true,
                callLogs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    /**
     * Update lead
     */
    async update(id: string, updateLeadDto: UpdateLeadDto) {
        return this.prisma.lead.update({
            where: { id },
            data: {
                firstName: (updateLeadDto as any).firstName,
                lastName: (updateLeadDto as any).lastName,
                phone: (updateLeadDto as any).phone,
                address: (updateLeadDto as any).address,
                tags: (updateLeadDto as any).tags,
                customFields: (updateLeadDto as any).customFields,
                status: (updateLeadDto as any).status,
            },
        });
    }

    /**
     * Update lead status
     */
    async updateStatus(id: string, status: LeadStatus) {
        return this.prisma.lead.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Delete lead
     */
    async remove(id: string) {
        return this.prisma.lead.delete({
            where: { id },
        });
    }

    /**
     * Get call history for a lead
     */
    async getCallHistory(id: string) {
        return this.prisma.callLog.findMany({
            where: { leadId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                campaign: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Get all lists
     */
    async findAllLists(accountId?: string) {
        return this.prisma.list.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }

    /**
     * Get all accounts
     */
    async findAllAccounts() {
        return this.prisma.account.findMany({
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Create a new account
     */
    async createAccount(name: string) {
        return this.prisma.account.create({
            data: { name },
        });
    }

    /**
     * Update account (name or numberPool)
     */
    async updateAccount(id: string, data: { name?: string; numberPool?: any }) {
        return this.prisma.account.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete account (handles cascade via Prisma logic if configured, but manual check for safety)
     */
    async deleteAccount(id: string) {
        return this.prisma.account.delete({
            where: { id },
        });
    }

    /**
     * Delete a list and all its leads (handling foreign keys)
     */
    async deleteList(id: string) {
        // 1. Get all leads in this list
        const leads = await this.prisma.lead.findMany({
            where: { listId: id },
            select: { id: true },
        });
        const leadIds = leads.map(l => l.id);

        // 2. Cascade cleanup: CallLogs first
        if (leadIds.length > 0) {
            await this.prisma.callLog.deleteMany({
                where: { leadId: { in: leadIds } },
            });
        }

        // 3. Cascade cleanup: Leads next
        await this.prisma.lead.deleteMany({
            where: { listId: id },
        });

        // 4. Case-by-case cleanup: Agent Assignments
        await this.prisma.agentList.deleteMany({
            where: { listId: id },
        });

        // 5. Case-by-case cleanup: Campaign Links
        await this.prisma.campaignList.deleteMany({
            where: { listId: id },
        });

        // 6. Finally delete the list
        return this.prisma.list.delete({
            where: { id },
        });
    }

    /**
     * Delete a single lead
     */
    async deleteLead(id: string) {
        return this.prisma.lead.delete({
            where: { id },
        });
    }

    /**
     * Create a new list
     */
    async createList(dto: { name: string; accountId: string; description?: string }) {
        return this.prisma.list.create({
            data: {
                name: dto.name,
                accountId: dto.accountId,
                description: dto.description,
            },
        });
    }
}

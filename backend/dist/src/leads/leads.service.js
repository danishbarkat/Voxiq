"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var LeadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const stream_1 = require("stream");
const csv_parser_1 = __importDefault(require("csv-parser"));
let LeadsService = LeadsService_1 = class LeadsService {
    prisma;
    logger = new common_1.Logger(LeadsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async importCsv(file, accountId, listId, newListName, requester) {
        await this.assertAccountAccess(accountId, requester);
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
            throw new common_1.BadRequestException('No list specified or created');
        }
        await this.assertListAccess(targetListId, requester, accountId);
        this.logger.log(`Starting CSV import for list ${targetListId}`);
        const leads = [];
        const errors = [];
        await new Promise((resolve, reject) => {
            const stream = stream_1.Readable.from(file.buffer);
            stream
                .pipe((0, csv_parser_1.default)())
                .on('data', (row) => {
                try {
                    const lead = this.parseCsvRow(row, targetListId, accountId);
                    if (lead) {
                        leads.push(lead);
                    }
                }
                catch (error) {
                    errors.push(`Error parsing row: ${error.message}`);
                }
            })
                .on('end', resolve)
                .on('error', reject);
        });
        this.logger.log(`Parsed ${leads.length} leads from CSV`);
        const { unique, duplicates } = await this.deduplicateLeads(leads, accountId);
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
                        status: lead.status || client_1.LeadStatus.NEW,
                        listId: lead.listId,
                        accountId: lead.accountId,
                    })),
                    skipDuplicates: true,
                });
                imported += batch.length;
            }
            catch (error) {
                this.logger.error(`Error importing batch: ${error.message}`);
            }
        }
        this.logger.log(`Import complete: ${imported} imported, ${duplicates} duplicates, ${errors.length} errors`);
        return {
            imported,
            duplicates,
            errors: errors.length,
        };
    }
    parseCsvRow(row, listId, accountId) {
        const normalizedRow = {};
        for (const key in row) {
            normalizedRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
        }
        const firstName = normalizedRow.firstname || normalizedRow.fname || normalizedRow.name || '';
        const lastName = normalizedRow.lastname || normalizedRow.lname || '';
        const phone = normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.mobile || normalizedRow.contact || '';
        if (!phone) {
            this.logger.warn(`Skipping row: No phone number found in columns: ${Object.keys(row).join(', ')}`);
            throw new Error('Phone number is required');
        }
        const normalizedPhone = phone.toString().replace(/\D/g, '');
        if (normalizedPhone.length < 10) {
            this.logger.warn(`Skipping row: Invalid phone number length (${normalizedPhone.length}): ${normalizedPhone}`);
            throw new Error('Invalid phone number (must be at least 10 digits)');
        }
        const standardFieldsNormalized = ['firstname', 'fname', 'name', 'lastname', 'lname', 'phone', 'phonenumber', 'mobile', 'contact', 'address', 'tags'];
        const customFields = {};
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
            tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
            customFields,
            listId,
            accountId,
            status: client_1.LeadStatus.NEW,
        };
    }
    async deduplicateLeads(leads, accountId) {
        const phoneNumbers = leads.map((l) => l.phone);
        const existingLeads = await this.prisma.lead.findMany({
            where: {
                accountId,
                phone: { in: phoneNumbers },
            },
            select: { phone: true },
        });
        const existingPhones = new Set(existingLeads.map((l) => l.phone));
        const seenPhones = new Set();
        const unique = [];
        let duplicates = 0;
        for (const lead of leads) {
            if (!seenPhones.has(lead.phone) && !existingPhones.has(lead.phone)) {
                seenPhones.add(lead.phone);
                unique.push(lead);
            }
            else {
                duplicates++;
            }
        }
        return { unique, duplicates };
    }
    async create(createLeadDto, requester) {
        await this.assertAccountAccess(createLeadDto.accountId, requester);
        await this.assertListAccess(createLeadDto.listId, requester, createLeadDto.accountId);
        return this.prisma.lead.create({
            data: {
                firstName: createLeadDto.firstName,
                lastName: createLeadDto.lastName,
                phone: createLeadDto.phone,
                address: createLeadDto.address,
                tags: createLeadDto.tags || [],
                customFields: createLeadDto.customFields || {},
                status: createLeadDto.status || client_1.LeadStatus.NEW,
                listId: createLeadDto.listId,
                accountId: createLeadDto.accountId,
            },
        });
    }
    async findAll(filters, requester) {
        const where = {};
        const requesterRole = requester?.role?.toLowerCase();
        if (requesterRole !== 'superadmin') {
            if (!requester?.accountId) {
                throw new common_1.ForbiddenException('Company context is required');
            }
            where.accountId = requester.accountId;
            if (filters?.accountId && filters.accountId !== requester.accountId) {
                throw new common_1.ForbiddenException('You can only view leads from your own company');
            }
        }
        else if (filters?.accountId) {
            where.accountId = filters.accountId;
        }
        if (filters?.listId)
            where.listId = filters.listId;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.agentId) {
            await this.assertUserAccess(filters.agentId, requester);
            const agentLists = await this.prisma.agentList.findMany({
                where: { agentId: filters.agentId },
                select: { listId: true },
            });
            const assignedListIds = agentLists.map(al => al.listId);
            if (assignedListIds.length === 0)
                return [];
            where.listId = { in: assignedListIds };
        }
        const statusOrder = {
            'NEW': 0,
            'CALLBACK': 1,
            'NO_ANSWER': 2,
            'UNREACHABLE': 2.5,
            'CONTACTED': 3,
        };
        const leads = await this.prisma.lead.findMany({
            where,
            take: filters?.limit || 500,
            skip: filters?.offset || 0,
            orderBy: [
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return leads.sort((a, b) => {
            const aOrder = statusOrder[a.status] ?? 10;
            const bOrder = statusOrder[b.status] ?? 10;
            if (aOrder !== bOrder)
                return aOrder - bOrder;
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });
    }
    async findOne(id, requester) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            include: {
                list: true,
                callLogs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        await this.assertLeadAccess(lead, requester);
        return lead;
    }
    async update(id, updateLeadDto, requester) {
        const existing = await this.ensureLeadExists(id);
        await this.assertLeadAccess(existing, requester);
        return this.prisma.lead.update({
            where: { id },
            data: {
                firstName: updateLeadDto.firstName,
                lastName: updateLeadDto.lastName,
                phone: updateLeadDto.phone,
                address: updateLeadDto.address,
                tags: updateLeadDto.tags,
                customFields: updateLeadDto.customFields,
                status: updateLeadDto.status,
            },
        });
    }
    async updateStatus(id, status, requester) {
        try {
            const existing = await this.ensureLeadExists(id);
            await this.assertLeadAccess(existing, requester);
            return await this.prisma.lead.update({
                where: { id },
                data: { status },
            });
        }
        catch (error) {
            if (error?.code === 'P2025')
                throw new common_1.NotFoundException(`Lead ${id} not found`);
            throw error;
        }
    }
    async remove(id, requester) {
        const existing = await this.ensureLeadExists(id);
        await this.assertLeadAccess(existing, requester);
        return this.prisma.lead.delete({
            where: { id },
        });
    }
    async getCallHistory(id, requester) {
        const existing = await this.ensureLeadExists(id);
        await this.assertLeadAccess(existing, requester);
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
    async findAllLists(accountId, requester) {
        const resolvedAccountId = await this.resolveScopedAccountId(accountId, requester);
        return this.prisma.list.findMany({
            where: resolvedAccountId ? { accountId: resolvedAccountId } : undefined,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    async findAllAccounts(requester) {
        const where = requester?.role?.toLowerCase() === 'superadmin'
            ? undefined
            : requester?.accountId
                ? { id: requester.accountId }
                : { id: '__no_account__' };
        return this.prisma.account.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }
    async createAccount(name, requester) {
        this.assertSuperAdmin(requester);
        return this.prisma.account.create({
            data: { name },
        });
    }
    async updateAccount(id, data, requester) {
        await this.assertAccountAccess(id, requester);
        return this.prisma.account.update({
            where: { id },
            data,
        });
    }
    async deleteAccount(id, requester) {
        this.assertSuperAdmin(requester);
        return this.prisma.account.delete({
            where: { id },
        });
    }
    async deleteList(id, requester) {
        await this.assertListAccess(id, requester);
        const leads = await this.prisma.lead.findMany({
            where: { listId: id },
            select: { id: true },
        });
        const leadIds = leads.map(l => l.id);
        if (leadIds.length > 0) {
            await this.prisma.callLog.deleteMany({
                where: { leadId: { in: leadIds } },
            });
        }
        await this.prisma.lead.deleteMany({
            where: { listId: id },
        });
        await this.prisma.agentList.deleteMany({
            where: { listId: id },
        });
        await this.prisma.campaignList.deleteMany({
            where: { listId: id },
        });
        return this.prisma.list.delete({
            where: { id },
        });
    }
    async deleteLead(id, requester) {
        const existing = await this.ensureLeadExists(id);
        await this.assertLeadAccess(existing, requester);
        return this.prisma.lead.delete({
            where: { id },
        });
    }
    async createList(dto, requester) {
        await this.assertAccountAccess(dto.accountId, requester);
        return this.prisma.list.create({
            data: {
                name: dto.name,
                accountId: dto.accountId,
                description: dto.description,
            },
        });
    }
    async ensureLeadExists(id) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
            select: { id: true, accountId: true, listId: true },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        return lead;
    }
    async resolveScopedAccountId(accountId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return accountId;
        }
        if (!requester?.accountId) {
            throw new common_1.ForbiddenException('Company context is required');
        }
        if (accountId && accountId !== requester.accountId) {
            throw new common_1.ForbiddenException('You can only access your own company');
        }
        return requester.accountId;
    }
    assertSuperAdmin(requester) {
        if (requester?.role?.toLowerCase() !== 'superadmin') {
            throw new common_1.ForbiddenException('Only the super admin can manage companies');
        }
    }
    async assertAccountAccess(accountId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        if (!requester?.accountId || requester.accountId !== accountId) {
            throw new common_1.ForbiddenException('You can only access data from your own company');
        }
    }
    async assertListAccess(listId, requester, expectedAccountId) {
        const list = await this.prisma.list.findUnique({
            where: { id: listId },
            select: { id: true, accountId: true },
        });
        if (!list) {
            throw new common_1.NotFoundException('List not found');
        }
        if (expectedAccountId && list.accountId !== expectedAccountId) {
            throw new common_1.ForbiddenException('List does not belong to the selected company');
        }
        await this.assertAccountAccess(list.accountId, requester);
    }
    async assertUserAccess(userId, requester) {
        if (requester?.role?.toLowerCase() === 'superadmin') {
            return;
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { accountId: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.assertAccountAccess(user.accountId, requester);
    }
    async assertLeadAccess(lead, requester) {
        await this.assertAccountAccess(lead.accountId, requester);
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = LeadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map
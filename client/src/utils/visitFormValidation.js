import * as z from 'zod';

const toDisplayName = (fieldPath = '') =>
    fieldPath
        .split('.')
        .pop()
        ?.replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase()) || 'Field';

const stripHtml = (value) => {
    if (typeof value !== 'string') return '';
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
};

const isEmptyText = (value) => {
    if (value === undefined || value === null) return true;
    return String(value).trim().length === 0;
};

const isEmptyRichText = (value) => stripHtml(value).length === 0;

const textSchema = (field) => {
    const message = `${field.label} is required`;
    const schema = z.preprocess(
        value => value === undefined || value === null ? '' : String(value),
        z.string()
    );

    if (!field.required) return schema.optional().or(z.literal(''));

    return schema.refine(value => !isEmptyText(value), { message });
};

const textareaSchema = (field) => {
    const schema = textSchema(field);
    if (!field.required) return schema;

    return schema.refine(value => String(value).trim().length >= 10, {
        message: `${field.label} must be at least 10 characters`
    });
};

const richTextSchema = (field) => {
    const schema = z.preprocess(
        value => value === undefined || value === null ? '' : String(value),
        z.string()
    );

    if (!field.required) return schema.optional().or(z.literal(''));

    return schema.refine(value => !isEmptyRichText(value), {
        message: `${field.label} is required`
    });
};

const numberSchema = (field) => {
    return z.preprocess((value) => {
        if (typeof value === 'number' && Number.isNaN(value)) return undefined;
        if (value === '' || value === undefined || value === null) return undefined;
        const numberValue = Number(value);
        return Number.isNaN(numberValue) ? value : numberValue;
    }, field.required
        ? z.number({
            required_error: `${field.label} is required`,
            invalid_type_error: `${field.label} must be a valid number`
        }).min(0, `${field.label} cannot be negative`)
        : z.number({
            invalid_type_error: `${field.label} must be a valid number`
        }).min(0, `${field.label} cannot be negative`).optional()
    );
};

const starRatingSchema = (field) => {
    return z.preprocess((value) => {
        if (typeof value === 'number' && Number.isNaN(value)) return undefined;
        if (value === '' || value === undefined || value === null) return undefined;
        const numberValue = Number(value);
        return Number.isNaN(numberValue) ? value : numberValue;
    }, field.required
        ? z.number({
            required_error: `${field.label} is required`,
            invalid_type_error: `${field.label} must be a rating from 1 to 5`
        }).min(1, `${field.label} is required`).max(5, `${field.label} must be 5 or less`)
        : z.number({
            invalid_type_error: `${field.label} must be a rating from 1 to 5`
        }).min(0).max(5).optional()
    );
};

const multiSelectSchema = (field) => {
    const arraySchema = field.required
        ? z.array(z.string()).min(1, `Select at least one option for ${field.label}`)
        : z.array(z.string());
    const schema = z.preprocess(
        value => Array.isArray(value) ? value : [],
        arraySchema
    );

    if (!field.required) return schema.optional();

    return schema;
};

const dynamicListSchema = (field) => {
    const arraySchema = field.required
        ? z.array(z.string()).min(1, `${field.label} requires at least one entry`)
        : z.array(z.string());
    const schema = z.preprocess(
        value => Array.isArray(value) ? value : [],
        arraySchema
    );

    if (!field.required) return schema.optional();

    return schema
        .refine(values => values.length === 0 || values.some(value => !isEmptyText(value)), {
            message: `${field.label} cannot be empty`
        });
};

const dynamicContactsSchema = (field) => {
    const contactObjSchema = z.object({
        name: z.string().optional().or(z.literal('')),
        designation: z.string().optional().or(z.literal('')),
        number: z.string().optional().or(z.literal(''))
    });
    const arraySchema = field.required
        ? z.array(contactObjSchema).min(1, `${field.label} requires at least one contact`)
        : z.array(contactObjSchema);
    const schema = z.preprocess(
        value => Array.isArray(value) ? value : [],
        arraySchema
    );

    if (!field.required) return schema.optional();

    return schema
        .refine(values => values.length === 0 || values.some(value =>
            !isEmptyText(value.name) || !isEmptyText(value.designation) || !isEmptyText(value.number)
        ), {
            message: `Enter at least one contact for ${field.label}`
        });
};

const actionItemsSchema = (field) => {
    const itemSchema = z.object({
        _id: z.any().optional(),
        _clientId: z.string().optional(),
        text: z.string().optional().or(z.literal('')),
        assignee: z.any().optional().nullable(),
        dueDate: z.string().optional().or(z.literal('')).nullable(),
        status: z.enum(['open', 'done']).optional(),
        history: z.array(z.any()).optional()
    });
    const schema = z.preprocess(
        value => Array.isArray(value) ? value.filter(item => !isEmptyText(item?.text)) : [],
        z.array(itemSchema)
    );

    if (!field.required) return schema.optional();

    return schema.refine(values => values.length > 0, {
        message: `${field.label} requires at least one action item`
    });
};

const fieldSchemaFor = (field) => {
    switch (field.type) {
        case 'number':
            return numberSchema(field);
        case 'star-rating':
            return starRatingSchema(field);
        case 'toggle':
            return z.boolean().default(false);
        case 'multi-select':
            return multiSelectSchema(field);
        case 'textarea':
            return textareaSchema(field);
        case 'richtext':
            return richTextSchema(field);
        case 'date':
        case 'datetime':
            return textSchema(field);
        case 'photo-upload':
            return z.string().optional().or(z.literal(''));
        case 'dynamic-list':
            return dynamicListSchema(field);
        case 'dynamic-contacts':
            return dynamicContactsSchema(field);
        case 'action_items':
            return actionItemsSchema(field);
        case 'office-area-combo':
            return textSchema(field);
        default:
            return textSchema(field);
    }
};

const setShapeField = (shape, fieldId, schema) => {
    const parts = fieldId.split('.');
    if (parts.length > 1) {
        const [group, key] = parts;
        if (!shape[group]) shape[group] = {};
        shape[group][key] = schema;
        return { group, key };
    }

    shape[fieldId] = schema;
    return { group: null, key: fieldId };
};

export const buildVisitFormSchema = (config) => {
    if (!config?.fields) return z.object({});

    const shape = {};

    config.fields.forEach(field => {
        const { group, key } = setShapeField(shape, field.id, fieldSchemaFor(field));

        if (group && ['dropdown', 'multi-select'].includes(field.type)) {
            shape[group][`other${key.charAt(0).toUpperCase() + key.slice(1)}`] = z.string().optional().or(z.literal(''));
        }
        if (field.id === 'kananTools.useAcademyPortal') {
            shape[group].academyPortalOther = z.string().optional().or(z.literal(''));
        }
        if (field.id === 'kananTools.useBooks') {
            shape[group].booksOther = z.string().optional().or(z.literal(''));
        }
    });

    if (shape.agencyProfile) {
        shape.agencyProfile.officeArea = z.preprocess((value) => {
            if (typeof value === 'number' && Number.isNaN(value)) return undefined;
            if (value === '' || value === undefined || value === null) return undefined;
            const numberValue = Number(value);
            return Number.isNaN(numberValue) ? value : numberValue;
        }, z.number({ invalid_type_error: 'Office Space Area must be a valid number' }).min(0, 'Office Space Area cannot be negative').optional());
    }

    if (shape.visitInfo) {
        shape.visitInfo = {
            ...shape.visitInfo,
            teamMembers: z.array(z.string()).optional()
        };
    }

    if (shape.checklist) {
        shape.checklist = {
            ...shape.checklist,
            waGroupName: z.string().optional()
        };
    }

    const finalShape = {};
    Object.keys(shape).forEach(key => {
        finalShape[key] = typeof shape[key] === 'object' && !shape[key].safeParse
            ? z.object(shape[key])
            : shape[key];
    });

    return z.object(finalShape).superRefine((data, ctx) => {
        const prepcomStatus = data.kananSpecific?.prepcomAcademy;
        const isPrepcomOrBoth = ['Prepcom', 'Both'].includes(prepcomStatus);

        if (isPrepcomOrBoth) {
            if (!data.kananTools?.portalCourses?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Select portal courses for Prepcom/Both partners',
                    path: ['kananTools', 'portalCourses']
                });
            }

            if (!data.kananTools?.bookCourses?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Select book courses for Prepcom/Both partners',
                    path: ['kananTools', 'bookCourses']
                });
            }

            if (!data.kananTools?.trainerRating || data.kananTools.trainerRating === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Trainer Knowledge Rating is required for Prepcom/Both partners',
                    path: ['kananTools', 'trainerRating']
                });
            }
        }

        const teamSize = Number(data.visitInfo?.teamSize || 1);
        if (teamSize > 1) {
            const teamMembers = data.visitInfo?.teamMembers || [];
            for (let index = 0; index < teamSize - 1; index += 1) {
                if (isEmptyText(teamMembers[index])) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Team Member ${index + 2} Name is required`,
                        path: ['visitInfo', 'teamMembers', index]
                    });
                }
            }
        }
    });
};

export const getNestedError = (errors, path) => {
    if (!path) return null;
    return path.split('.').reduce((obj, key) => obj?.[key], errors);
};

export const getFirstFormErrorPath = (errors, prefix = '') => {
    if (!errors || typeof errors !== 'object') return null;
    if (errors.message) return prefix;

    for (const key of Object.keys(errors)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const result = getFirstFormErrorPath(errors[key], fullPath);
        if (result) return result;
    }

    return null;
};

export const describeFormError = (errors, config, groups) => {
    const firstErrorPath = getFirstFormErrorPath(errors);
    if (!firstErrorPath) {
        return {
            title: 'Please check the form',
            message: 'Some required information is missing or invalid.',
            stepIndex: 0
        };
    }

    const directError = getNestedError(errors, firstErrorPath);
    const field = config?.fields?.find(candidate =>
        firstErrorPath === candidate.id || firstErrorPath.startsWith(`${candidate.id}.`)
    );

    if (field) {
        const stepIndex = groups.indexOf(field.group);
        return {
            title: `Check ${field.label}`,
            message: directError?.message || `${field.label} is missing or invalid.`,
            stepIndex: stepIndex === -1 ? 0 : stepIndex,
            fieldLabel: field.label
        };
    }

    if (firstErrorPath.startsWith('visitInfo.teamMembers')) {
        return {
            title: 'Check Visit Team Details',
            message: directError?.message || 'Enter all required team member names.',
            stepIndex: Math.max(0, groups.indexOf('Visit Details')),
            fieldLabel: 'Visit Team Details'
        };
    }

    return {
        title: `Check ${toDisplayName(firstErrorPath)}`,
        message: directError?.message || 'This field is missing or invalid.',
        stepIndex: 0,
        fieldLabel: toDisplayName(firstErrorPath)
    };
};

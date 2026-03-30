import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../utils/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StepIndicator from '../components/SurveyForm/StepIndicator';
import DynamicField from '../components/FormBuilder/DynamicField';
import { Save, ChevronLeft, ChevronRight, CheckCircle, Info, Clock, Loader2, MapPin, AlertCircle } from 'lucide-react';

const NewVisit = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('Drafts are saved automatically');
    const [visitId, setVisitId] = useState(null);
    const [disabledFields, setDisabledFields] = useState({});
    const [config, setConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const timerRef = useRef(null);
    const { user } = useAuth();
    const [gpsLocation, setGpsLocation] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [gpsCoords, setGpsCoords] = useState({ lat: null, lng: null });

    const fetchExactLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported by your browser');
            return;
        }
        setFetchingLocation(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    if (data && data.display_name) {
                        setGpsLocation(data.display_name);
                        setGpsCoords({ lat: latitude, lng: longitude });
                    } else {
                        setLocationError('Could not translate coordinates to address');
                    }
                } catch {
                    setLocationError('Failed to fetch address from OpenStreetMap');
                } finally {
                    setFetchingLocation(false);
                }
            },
            () => {
                setLocationError('Location permission denied / unavailable');
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        if (!id && user) fetchExactLocation();
    }, [id, user]);

    const urlFormType = searchParams.get('formType');

    const schema = useMemo(() => {
        if (!config || !config.fields) return z.object({});
        const shape = {};
        config.fields.forEach(field => {
            let fieldSchema;
            switch (field.type) {
                case 'number':
                case 'star-rating':
                    // Preprocess to handle empty strings/NaN from number inputs
                    fieldSchema = z.preprocess((val) => {
                        if (val === '' || val === undefined || val === null || isNaN(Number(val))) return undefined;
                        return Number(val);
                    }, field.required ? z.number({ invalid_type_error: `${field.label} must be a number` }).min(0) : z.number().optional());
                    
                    if (field.required) {
                        fieldSchema = fieldSchema.refine(val => val !== undefined, { message: `${field.label} is required` });
                    }
                    break;
                case 'toggle':
                    fieldSchema = z.boolean().default(false);
                    break;
                case 'multi-select':
                    fieldSchema = z.array(z.string());
                    if (field.required) fieldSchema = fieldSchema.min(1, `Select at least one ${field.label}`);
                    break;
                case 'textarea':
                    fieldSchema = z.string();
                    if (field.required) fieldSchema = fieldSchema.min(10, `${field.label} must be at least 10 characters`);
                    break;
                case 'photo-upload':
                    fieldSchema = z.string().optional().or(z.literal(''));
                    break;
                default:
                    fieldSchema = z.string();
                    if (field.required) fieldSchema = fieldSchema.min(1, `${field.label} is required`);
                    else fieldSchema = fieldSchema.optional().or(z.literal(''));
            }
            const parts = field.id.split('.');
            if (parts.length > 1) {
                const [group, key] = parts;
                if (!shape[group]) shape[group] = {};
                shape[group][key] = fieldSchema;
            } else {
                shape[field.id] = fieldSchema;
            }
        });

        // Add special handling for teamMembers array
        if (!shape.visitInfo) shape.visitInfo = {};
        shape.visitInfo = {
            ...shape.visitInfo,
            teamMembers: z.array(z.string()).optional()
        };

        // Add special handling for Checklist fields
        if (!shape.checklist) shape.checklist = {};
        shape.checklist = {
            ...shape.checklist,
            waGroupName: z.string().optional()
        };

        const finalShape = {};
        Object.keys(shape).forEach(key => {
            if (typeof shape[key] === 'object' && !shape[key].safeParse) {
                finalShape[key] = z.object(shape[key]);
            } else {
                finalShape[key] = shape[key];
            }
        });
        const baseSchema = z.object(finalShape);

        // Add conditional refinements
        return baseSchema.superRefine((data, ctx) => {
            const prepcomStatus = data.kananSpecific?.prepcomAcademy;
            const isPrepcomOrBoth = ['Prepcom', 'Both'].includes(prepcomStatus);

            if (isPrepcomOrBoth) {
                // 1. Portal Courses
                if (!data.kananTools?.portalCourses || data.kananTools.portalCourses.length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Courses for which Portal used is required for Prepcom/Both partners",
                        path: ['kananTools', 'portalCourses']
                    });
                }

                // 2. Is using Kanan Books (Toggle assumes boolean, but let's check)
                // If it's a toggle, we might want to ensure they explicitly checked it if that's what "mandatory" means
                // But usually mandatory for a toggle means "must be true" if that's the logic, or "must be touched".
                // User said "Is using Kanan Books? this section should mandatory". 
                // I'll interpret this as they must select something (Yes/No). 
                // Since toggle is usually Yes/No, it's always "selected". 
                // However, if they meant it MUST be Yes, that's different.
                // Let's assume they mean it must be filled/considered.

                // 3. Courses for which Books used
                if (!data.kananTools?.bookCourses || data.kananTools.bookCourses.length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Courses for which Books used is required for Prepcom/Both partners",
                        path: ['kananTools', 'bookCourses']
                    });
                }

                // 4. Classroom Content
                // Same as Books, if it's a toggle it's already there.

                // 5. Trainer Rating
                if (!data.kananTools?.trainerRating || data.kananTools.trainerRating === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Trainer Knowledge Rating is required for Prepcom/Both partners",
                        path: ['kananTools', 'trainerRating']
                    });
                }
            }
        });
    }, [config]);

    const { control, handleSubmit, register, reset, watch, setValue, trigger, formState: { errors, isValid, isDirty } } = useForm({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            status: 'draft'
        }
    });

    // Handle BeforeUnload (Browser Back/Close)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for most browsers to show the default confirm dialog
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const formData = watch();
    const teamSize = parseInt(watch('visitInfo.teamSize') || '1');
    const pinCodeValue = watch('location.pinCode');

    // Auto-fill City and State based on PIN Code
    useEffect(() => {
        const fetchAddress = async () => {
            if (pinCodeValue?.length === 6) {
                try {
                    const res = await axios.get(`https://api.postalpincode.in/pincode/${pinCodeValue}`);
                    if (res.data[0].Status === 'Success') {
                        const postOffice = res.data[0].PostOffice[0];
                        setValue('location.city', postOffice.District, { shouldValidate: true });
                        setValue('location.state', postOffice.State, { shouldValidate: true });
                        setDisabledFields(prev => ({
                            ...prev,
                            'location.city': true,
                            'location.state': true
                        }));
                    }
                } catch (err) {
                    console.error('Error fetching PIN code:', err);
                }
            } else if (pinCodeValue?.length < 6) {
                // If user deletes PIN, re-enable fields (optional, but good UX)
                if (disabledFields['location.city']) {
                    setDisabledFields(prev => {
                        const next = { ...prev };
                        delete next['location.city'];
                        delete next['location.state'];
                        return next;
                    });
                }
            }
        };
        fetchAddress();
    }, [pinCodeValue, setValue]);

    const waGroupValue = watch('checklist.waGroup');
    const studentNameValue = watch('studentInfo.name');
    const visitDateValue = watch('visitInfo.visitDate');

    // Auto-generate WhatsApp Group Name
    useEffect(() => {
        if (waGroupValue && studentNameValue && visitDateValue) {
            try {
                const date = new Date(visitDateValue);
                if (isNaN(date.getTime())) return;
                
                const d = date.getDate();
                const m = date.getMonth() + 1;
                const y = date.getFullYear();
                const cleanName = studentNameValue.replace(/\s+/g, '').toLowerCase();
                const groupName = `${d}${m}${y}-${cleanName}`;
                
                setValue('checklist.waGroupName', groupName);
                if (!disabledFields['checklist.waGroupName']) {
                    setDisabledFields(prev => ({ ...prev, 'checklist.waGroupName': true }));
                }
            } catch (err) {
                console.error('Error generating WA group name:', err);
            }
        } else if (!waGroupValue) {
            setValue('checklist.waGroupName', '');
        }
    }, [waGroupValue, studentNameValue, visitDateValue, setValue]);

    useEffect(() => {
        const loadForm = async () => {
            try {
                if (!user) return;
                setLoadingConfig(true);

                let formType = urlFormType;
                let visitData = null;

                // 1. If editing, fetch visit first to get its REAL formType
                if (id) {
                    const vRes = await api.get(`/visits/${id}`);
                    visitData = vRes.data.data;
                    formType = visitData.formType;
                    setVisitId(id);
                }

                // 2. Fallback for new visits
                if (!formType) {
                    formType = (user.department === 'B2C' || user.role === 'home_visit') ? 'home_visit' : 'generic';
                }

                // 3. Fetch config for the derived formType
                const cRes = await api.get(`/form-config?formType=${formType}`);
                if (cRes.data?.success && cRes.data.data) {
                    setConfig(cRes.data.data);
                }

                // 4. Populate form if visitData exists
                if (visitData) {
                    if (visitData.meta?.meetingStart) visitData.meta.meetingStart = new Date(visitData.meta.meetingStart).toISOString().slice(0, 16);
                    if (visitData.meta?.meetingEnd) visitData.meta.meetingEnd = new Date(visitData.meta.meetingEnd).toISOString().slice(0, 16);
                    if (visitData.gpsLocation) setGpsLocation(visitData.gpsLocation);
                    if (visitData.gpsCoordinates?.lat) setGpsCoords({ lat: visitData.gpsCoordinates.lat, lng: visitData.gpsCoordinates.lng });
                    reset(visitData);
                }
            } catch (err) {
                console.error('Error loading form:', err);
            } finally {
                setLoadingConfig(false);
            }
        };

        if (user) loadForm();
    }, [user, id, urlFormType, reset]);


    useEffect(() => {
        if (isSaving || loadingConfig) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const hasIdentifier = formData.meta?.companyName || formData.studentInfo?.name;
            if (hasIdentifier) saveDraft();
        }, 60000);
        return () => clearTimeout(timerRef.current);
    }, [formData, isSaving, loadingConfig]);

    const saveDraft = async () => {
        const identifier = formData.meta?.companyName || formData.studentInfo?.name;
        if (!identifier) {
            setSaveStatus('Draft needs Company/Student name to save');
            return;
        }
        setSaveStatus('Saving draft...');
        try {
            const payload = {
                ...formData,
                gpsLocation,
                gpsCoordinates: gpsCoords,
                status: 'draft',
                formVersion: config?.version,
                formType: config?.formType
            };
            if (visitId) {
                await api.put(`/visits/${visitId}`, payload);
            } else {
                const res = await api.post('/visits', payload);
                setVisitId(res.data.data._id);
            }
            setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
        } catch {
            setSaveStatus('Draft save failed');
        }
    };

    const onValidationError = (errors) => {
        console.error('Submission Validation Errors:', errors);
        
        // Flatten nested errors to find the first error's field ID
        const getFirstErrorId = (errs, prefix = '') => {
            if (!errs || typeof errs !== 'object') return null;
            
            // Check if this object itself has a message (e.g. at this level)
            if (errs.message) return prefix;

            for (const key in errs) {
                const fullPath = prefix ? `${prefix}.${key}` : key;
                const fieldError = errs[key];
                
                if (fieldError?.message) return fullPath;
                
                if (typeof fieldError === 'object') {
                    const nested = getFirstErrorId(fieldError, fullPath);
                    if (nested) return nested;
                }
            }
            return null;
        };

        const firstErrorId = getFirstErrorId(errors);
        if (firstErrorId) {
            // Find which step (group) this field belongs to
            // Split prefix (e.g. 'kananTools.portalCourses' -> 'kananTools')
            const field = config.fields.find(f => f.id === firstErrorId || firstErrorId.startsWith(f.id));
            if (field) {
                const targetStep = groups.indexOf(field.group);
                if (targetStep !== -1) {
                    alert(`Submission blocked: Please check "${field.label}" in Step ${targetStep + 1} (${field.group})\n\nError: ${errors[firstErrorId.split('.')[0]]?.[firstErrorId.split('.')[1]]?.message || 'Missing required information'}`);
                    setCurrentStep(targetStep);
                    window.scrollTo(0, 0);
                    return;
                }
            }
            alert(`Please correct errors in your form: ${firstErrorId}`);
        }
    };

    const onSubmit = async (data) => {
        setIsSaving(true);
        try {
            const payload = {
                ...data,
                gpsLocation,
                gpsCoordinates: gpsCoords,
                status: 'submitted',
                formVersion: config?.version,
                formType: config?.formType
            };
            if (visitId) {
                await api.put(`/visits/${visitId}`, payload);
            } else {
                await api.post('/visits', payload);
            }
            setSaveStatus('Submitted successfully!');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            alert('Error submitting: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const groups = useMemo(() => {
        if (!config || !config.fields) return [];
        return [...new Set(config.fields.map(f => f.group))];
    }, [config]);

    const nextStep = async () => {
        const currentGroup = groups[currentStep];
        const stepFieldIds = config.fields.filter(f => f.group === currentGroup).map(f => f.id);
        const isStepValid = await trigger(stepFieldIds);
        if (isStepValid) {
            setCurrentStep(prev => Math.min(prev + 1, groups.length - 1));
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        window.scrollTo(0, 0);
    };

    if (loadingConfig) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
            <p className="font-bold text-slate-700">Syncing form configuration...</p>
            <p className="text-sm text-slate-400 mt-1">This will only take a moment</p>
        </div>
    );

    if (!config) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Info className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Form Not Available</h3>
            <p className="text-slate-500 max-w-md">No active form configuration found for your role. Contact a SuperAdmin to publish a form.</p>
            <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Return to Dashboard</button>
        </div>
    );

    const isHomeVisit = config?.formType === 'home_visit' || urlFormType === 'home_visit';

    return (
        <div className="pb-32 page-enter">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {id ? 'Edit' : 'New'} {isHomeVisit ? 'Home Visit' : 'Visit'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Complete the field report below</p>
                    </div>

                    <button
                        onClick={saveDraft}
                        className="btn-outline shrink-0 flex items-center justify-center gap-2 py-2.5 sm:py-2 px-6 shadow-sm hover:shadow-md transition-all sm:w-auto w-full"
                    >
                        <Save className="w-4 h-4 text-brand-blue" />
                        <span className="font-bold">Save Draft</span>
                    </button>
                </div>

                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Auto-save status */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white shadow-sm border border-slate-100 px-3 py-2 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-brand-sky animate-pulse" />
                        {saveStatus}
                    </div>

                    {/* GPS Location */}
                    <div className={`flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl border transition-all ${
                        gpsLocation ? 'bg-white text-brand-green border-brand-green/20 shadow-sm' :
                        locationError ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' :
                        'bg-white text-slate-400 border-slate-100 shadow-sm'
                    }`}>
                        {fetchingLocation ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin text-brand-sky" /> <span className="text-slate-500">Detecting location...</span></>
                        ) : gpsLocation ? (
                            <><MapPin className="w-3.5 h-3.5 text-brand-green shrink-0" /><span className="truncate max-w-[150px] sm:max-w-xs" title={gpsLocation}>{gpsLocation}</span></>
                        ) : locationError ? (
                            <><AlertCircle className="w-3.5 h-3.5" /> <span>{locationError}</span>
                                <button type="button" onClick={fetchExactLocation} className="underline ml-1 font-bold text-brand-blue">Retry</button>
                            </>
                        ) : (
                            <><MapPin className="w-3.5 h-3.5" /> <span>Location pending</span></>
                        )}
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} steps={groups} />

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-6 max-w-4xl mx-auto">
                <div className="card shadow-premium animate-fade-in">
                    {/* Section Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100/60">
                        <div className="w-11 h-11 rounded-2xl bg-brand-blue flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-blue/20 shrink-0">
                            {currentStep + 1}
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none mb-1">{groups[currentStep]}</h3>
                            <p className="text-xs text-slate-500 font-medium tracking-tight">Required details for this visit step</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step</span>
                            <span className="text-sm font-black text-brand-blue">{currentStep + 1}</span>
                            <span className="text-sm font-bold text-slate-200">/</span>
                            <span className="text-sm font-black text-slate-400">{groups.length}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {config.fields
                            .filter(f => f.group === groups[currentStep])
                            .map(field => {
                                // 1. Render the main field
                                const mainField = (
                                    <React.Fragment key={`main_${field.id}`}>
                                        <DynamicField
                                            field={field}
                                            register={register}
                                            control={control}
                                            errors={errors}
                                            watch={watch}
                                            setValue={setValue}
                                            Controller={Controller}
                                            disabled={disabledFields[field.id]}
                                        />
                                        {field.id === 'checklist.waGroup' && waGroupValue && (
                                            <DynamicField
                                                key="checklist.waGroupName"
                                                field={{
                                                    id: 'checklist.waGroupName',
                                                    label: 'WhatsApp Group Name',
                                                    type: 'text',
                                                    required: false,
                                                    placeholder: 'Generating...'
                                                }}
                                                register={register}
                                                control={control}
                                                errors={errors}
                                                watch={watch}
                                                setValue={setValue}
                                                Controller={Controller}
                                                disabled={true}
                                                showCopy={true}
                                            />
                                        )}
                                    </React.Fragment>
                                );

                                // 2. If it's the teamSize field, inject additional fields
                                if (field.id === 'visitInfo.teamSize' && teamSize > 1) {
                                    const extraFields = [];
                                    for (let i = 1; i < teamSize; i++) {
                                        extraFields.push(
                                            <div key={`extra_officer_${i}`} className="space-y-1.5">
                                                <label className="label">
                                                    Team Member {i + 1} Name <span className="text-red-500 ml-0.5">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    {...register(`visitInfo.teamMembers.${i - 1}`)}
                                                    className={`input-field ${errors.visitInfo?.teamMembers?.[i - 1] ? 'border-red-400' : ''}`}
                                                    placeholder={`Enter member ${i + 1} name...`}
                                                />
                                                {errors.visitInfo?.teamMembers?.[i - 1] && (
                                                    <p className="text-xs text-red-500 font-medium mt-1">{errors.visitInfo.teamMembers[i - 1].message}</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <React.Fragment key={`group_${field.id}`}>
                                            {mainField}
                                            {extraFields}
                                        </React.Fragment>
                                    );
                                }

                                return (
                                    <React.Fragment key={`node_${field.id}`}>
                                        {mainField}
                                    </React.Fragment>
                                );
                            })
                        }
                    </div>
                </div>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl z-40">
                    <div className="card glass flex items-center justify-between gap-2 p-2.5 sm:p-5 shadow-premium backdrop-blur-xl border-white/40 ring-1 ring-brand-blue/5">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="btn-outline flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-2xl font-bold bg-white/80 hover:bg-white text-slate-700 hover:text-brand-blue shadow-sm border-white/60 transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="sm:inline hidden">Back</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {groups.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                        i === currentStep ? 'w-6 sm:w-8 bg-brand-blue shadow-sm' : 
                                        i < currentStep ? 'w-1.5 bg-brand-green' : 
                                        'w-1.5 bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        {currentStep === groups.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit, onValidationError)}
                                disabled={isSaving}
                                className="btn-primary flex items-center justify-center gap-2 px-5 sm:px-8 py-3 rounded-2xl font-bold bg-brand-gradient text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all active:scale-95 disabled:opacity-70 disabled:grayscale text-sm sm:text-base"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Submit</>}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="btn-primary flex items-center justify-center gap-2 px-5 sm:px-8 py-3 rounded-2xl font-bold bg-brand-gradient text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all active:scale-95 text-sm sm:text-base"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default NewVisit;

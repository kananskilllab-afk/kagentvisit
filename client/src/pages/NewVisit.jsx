import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../utils/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StepIndicator from '../components/SurveyForm/StepIndicator';
import DynamicField from '../components/FormBuilder/DynamicField';
import AgentHistoryCard from '../components/AgentHistoryCard';
import { buildVisitFormSchema, describeFormError } from '../utils/visitFormValidation';
import { Save, ChevronLeft, ChevronRight, CheckCircle, Info, Loader2, MapPin, AlertCircle, Bell, ShieldAlert, FileText, User as UserIcon } from 'lucide-react';

const actionItemsField = {
    id: 'actionItems',
    group: 'Final Summary',
    label: 'Action Items',
    type: 'action_items',
    required: true
};

const normalizeVisitFormConfig = (formConfig) => {
    if (!formConfig?.fields) return formConfig;

    let hasActionItems = false;
    const fields = [];

    formConfig.fields.forEach(field => {
        if (field.id === 'postVisit.actionPoints' || field.id === 'actionItems') {
            if (!hasActionItems) {
                fields.push({
                    ...actionItemsField,
                    group: field.group || actionItemsField.group,
                    required: field.required !== false
                });
                hasActionItems = true;
            }
            return;
        }

        if (field.id === 'postVisit.remarks' && !hasActionItems) {
            fields.push(actionItemsField);
            hasActionItems = true;
        }

        fields.push(field);
    });

    return {
        ...formConfig,
        fields
    };
};

const stripHtml = (value = '') => String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const hydrateLegacyActionItems = (visitData) => {
    if (!visitData || (Array.isArray(visitData.actionItems) && visitData.actionItems.length > 0)) {
        return visitData;
    }

    const legacyText = stripHtml(visitData.postVisit?.actionPoints);
    if (!legacyText) return visitData;

    return {
        ...visitData,
        actionItems: [{
            _clientId: `legacy_${visitData._id || Date.now()}`,
            text: legacyText,
            assignee: '',
            dueDate: '',
            status: 'open',
            history: []
        }]
    };
};

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
    const { user, isAdmin } = useAuth();
    const [gpsLocation, setGpsLocation] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [gpsCoords, setGpsCoords] = useState({ lat: null, lng: null });
    const [isLocked, setIsLocked] = useState(false);
    const [unlockRequestSent, setUnlockRequestSent] = useState(false);
    const [createdAt, setCreatedAt] = useState(null);
    const [submittedAt, setSubmittedAt] = useState(null);
    const [visitStatus, setVisitStatus] = useState('draft');
    const [adminNotes, setAdminNotes] = useState([]);
    const [forUser, setForUser] = useState('');
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [validationNotice, setValidationNotice] = useState(null);

    // --- Draft logic helpers ---
    const isDraft = visitStatus === 'draft';

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

    const schema = useMemo(() => buildVisitFormSchema(config), [config]);

    const { control, handleSubmit, register, reset, watch, setValue, trigger, formState: { errors, isDirty } } = useForm({
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
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const classificationValue = watch('studentInfo.classification');
    const prevClassificationRef = React.useRef(classificationValue);
    const pinCodeValue = watch('location.pinCode');
    const teamSize = parseInt(watch('visitInfo.teamSize') || '1');
    const formData = watch();

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

    // Reset inquiry types if classification changes
    useEffect(() => {
        if (classificationValue && prevClassificationRef.current !== classificationValue) {
            setValue('studentInfo.inquiryTypes', []);
        }
        prevClassificationRef.current = classificationValue;
    }, [classificationValue, setValue]);

    const waGroupValue = watch('checklist.waGroup');
    const studentNameValue = watch('studentInfo.name');
    const crmIdValue = watch('studentInfo.crmId');
    const selectedAgentId = watch('meta.agentId');
    const selectedAgentName = watch('meta.companyName');
    const actionItemsValue = watch('actionItems');
    const carryForwardAgentRef = useRef(null);

    // Auto-generate WhatsApp Group Name: CRMIDNAME@Kanan.Co
    useEffect(() => {
        if (waGroupValue && studentNameValue && crmIdValue) {
            try {
                const cleanName = studentNameValue.replace(/\s+/g, '');
                const groupName = `${crmIdValue}${cleanName}@Kanan.Co`;

                setValue('checklist.waGroupName', groupName, { shouldValidate: true });
                if (!disabledFields['checklist.waGroupName']) {
                    setDisabledFields(prev => ({ ...prev, 'checklist.waGroupName': true }));
                }
            } catch (err) {
                console.error('Error generating WA group name:', err);
            }
        } else if (!waGroupValue) {
            setValue('checklist.waGroupName', '');
        }
    }, [waGroupValue, studentNameValue, crmIdValue, setValue]);

    const handleAgentOpenItems = useCallback((openItems = []) => {
        if (id || !selectedAgentId || carryForwardAgentRef.current === selectedAgentId) return;
        const existing = Array.isArray(actionItemsValue) ? actionItemsValue.filter(item => item?.text?.trim()) : [];
        if (existing.length > 0 || openItems.length === 0) return;
        setValue('actionItems', openItems.map(item => ({
            _clientId: `carry_${item._id || Date.now()}_${Math.random().toString(36).slice(2)}`,
            text: item.text,
            assignee: item.assignee || '',
            dueDate: item.dueDate || '',
            status: 'open',
            history: item.history || []
        })), { shouldDirty: true, shouldValidate: true });
        carryForwardAgentRef.current = selectedAgentId;
    }, [actionItemsValue, id, selectedAgentId, setValue]);

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
                    setConfig(normalizeVisitFormConfig(cRes.data.data));
                }

                // 4. Populate form if visitData exists
                if (visitData) {
                    if (visitData.meta?.meetingStart) visitData.meta.meetingStart = new Date(visitData.meta.meetingStart).toISOString().slice(0, 16);
                    if (visitData.meta?.meetingEnd) visitData.meta.meetingEnd = new Date(visitData.meta.meetingEnd).toISOString().slice(0, 16);
                    if (visitData.gpsLocation) setGpsLocation(visitData.gpsLocation);
                    if (visitData.gpsCoordinates?.lat) setGpsCoords({ lat: visitData.gpsCoordinates.lat, lng: visitData.gpsCoordinates.lng });

                    // Only lock if NOT a draft — drafts are always editable
                    const isVisitDraft = visitData.status === 'draft';
                    setIsLocked(isVisitDraft ? false : !!visitData.isLocked);
                    setUnlockRequestSent(!!visitData.unlockRequestSent);
                    setCreatedAt(visitData.createdAt);
                    setSubmittedAt(visitData.submittedAt || null);
                    setVisitStatus(visitData.status || 'draft');
                    setAdminNotes(visitData.adminNotes || []);
                    if (visitData.forUser) {
                        const fId = typeof visitData.forUser === 'object' ? visitData.forUser._id : visitData.forUser;
                        setForUser(fId || '');
                    }

                    // Handle deep link to specific step
                    const stepParam = searchParams.get('step');
                    if (stepParam !== null && !isNaN(parseInt(stepParam))) {
                        setCurrentStep(parseInt(stepParam));
                    }

                    reset(hydrateLegacyActionItems(visitData));
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
        if (!isAdmin) return;
        api.get('/users/assignable').then(res => {
            setAssignableUsers(res.data.data || []);
        }).catch(() => {});
    }, [isAdmin]);

    // Re-fetch form config when tab regains focus (new visits only) so superadmin changes appear immediately
    useEffect(() => {
        if (id || !user) return; // skip for edit mode
        const handleVisibility = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const formType = urlFormType || ((user.department === 'B2C' || user.role === 'home_visit') ? 'home_visit' : 'generic');
                const cRes = await api.get(`/form-config?formType=${formType}`);
                if (cRes.data?.success && cRes.data.data) {
                    setConfig(prev => {
                        const nextConfig = normalizeVisitFormConfig(cRes.data.data);
                        if (prev?._id === nextConfig._id) return prev; // no change
                        return nextConfig;
                    });
                }
            } catch { /* silent */ }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [id, user, urlFormType]);

    // saveDraft — defined before auto-save effects so refs are never stale
    const groups = useMemo(() => {
        if (!config || !config.fields) return [];
        return [...new Set(config.fields.map(f => f.group))];
    }, [config]);

    const saveDraftRef = useRef(null);

    const buildVisitPayload = useCallback((data, status) => ({
        ...data,
        gpsLocation,
        gpsCoordinates: gpsCoords,
        status,
        formVersion: config?.version,
        formType: config?.formType,
        ...(isAdmin && forUser ? { forUser } : {})
    }), [gpsLocation, gpsCoords, config, isAdmin, forUser]);

    const saveDraft = useCallback(async () => {
        if (isLocked) return;
        const identifier = formData.meta?.companyName || formData.studentInfo?.name;
        if (!identifier) {
            setSaveStatus('Draft needs Company/Student name to save');
            return;
        }
        setSaveStatus('Saving draft...');
        try {
            const payload = buildVisitPayload(formData, 'draft');
            if (visitId) {
                await api.put(`/visits/${visitId}`, payload);
            } else {
                const res = await api.post('/visits', payload);
                setVisitId(res.data.data._id);
            }
            setSaveStatus(`Draft saved at ${new Date().toLocaleTimeString()}`);
        } catch {
            setSaveStatus('Draft save failed');
        }
    }, [formData, visitId, isLocked, buildVisitPayload]);

    const saveSubmittedChanges = useCallback(async () => {
        if (isLocked || !visitId) return;
        const valid = await trigger();
        if (!valid) {
            const notice = describeFormError(errors, config, groups);
            setValidationNotice(notice);
            setCurrentStep(notice.stepIndex);
            window.scrollTo(0, 0);
            return;
        }
        setIsSaving(true);
        setValidationNotice(null);
        setSaveStatus('Saving changes...');
        try {
            const payload = buildVisitPayload(formData, visitStatus || 'submitted');
            await api.put(`/visits/${visitId}`, payload);
            setSaveStatus(`Changes saved at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            setSaveStatus('Save changes failed');
            alert('Error saving changes: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    }, [isLocked, visitId, trigger, errors, config, groups, buildVisitPayload, formData, visitStatus]);

    // Keep a stable ref so timeouts/event listeners always call the latest version
    useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

    // Auto-save draft every 30s of inactivity
    useEffect(() => {
        if (isSaving || loadingConfig || !isDraft) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            saveDraftRef.current?.();
        }, 30000);
        return () => clearTimeout(timerRef.current);
    }, [formData, isSaving, loadingConfig, isDraft]);

    // Auto-save when user switches tabs or leaves the page
    useEffect(() => {
        if (!isDraft) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveDraftRef.current?.();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isDraft]);

    const requestUnlock = async () => {
        if (!visitId) return;
        setIsSaving(true);
        try {
            await api.post(`/visits/${visitId}/request-unlock`);
            setUnlockRequestSent(true);
            alert('Unlock request sent to administrator.');
        } catch (err) {
            alert('Failed to send request: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const toggleUnlock = async (unlock) => {
        if (!visitId) return;
        setIsSaving(true);
        try {
            await api.put(`/visits/${visitId}/approve-unlock`, { unlock });
            setIsLocked(!unlock);
            setUnlockRequestSent(false);
            alert(unlock ? 'Visit Unlocked' : 'Visit Locked');
        } catch (err) {
            alert('Admin Action Failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const onValidationError = (errors) => {
        console.error('Submission Validation Errors:', errors);

        const notice = describeFormError(errors, config, groups);
        setValidationNotice(notice);
        setCurrentStep(notice.stepIndex);
        window.scrollTo(0, 0);
    };

    const onSubmit = async (data) => {
        setIsSaving(true);
        setValidationNotice(null);
        try {
            const payload = buildVisitPayload(data, 'submitted');
            if (visitId) {
                await api.put(`/visits/${visitId}`, payload);
            } else {
                await api.post('/visits', payload);
            }
            setVisitStatus('submitted');
            setSaveStatus('Submitted successfully!');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            alert('Error submitting: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const nextStep = async () => {
        const currentGroup = groups[currentStep];
        const stepFieldIds = config.fields.filter(f => f.group === currentGroup).map(f => f.id);
        if (stepFieldIds.includes('visitInfo.teamSize')) {
            stepFieldIds.push('visitInfo.teamMembers');
        }
        const isStepValid = await trigger(stepFieldIds);
        if (isStepValid) {
            setValidationNotice(null);
            if (isDraft) saveDraftRef.current?.();
            setCurrentStep(prev => Math.min(prev + 1, groups.length - 1));
            window.scrollTo(0, 0);
        } else {
            setValidationNotice({
                title: 'Complete this step',
                message: 'Please fix the highlighted fields before continuing.',
                stepIndex: currentStep
            });
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setValidationNotice(null);
        if (isDraft) saveDraftRef.current?.();
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

    // 24h window info — only relevant for SUBMITTED visits, never drafts
    const getEditWindowInfo = () => {
        if (!id || isDraft) return null;
        const anchor = submittedAt || createdAt;
        if (!anchor) return null;
        const anchorDate = new Date(anchor);
        const now = new Date();
        const hoursElapsed = (now - anchorDate) / (1000 * 60 * 60);
        const hoursLeft = 24 - hoursElapsed;
        if (hoursLeft <= 0) return null;
        return { hoursLeft, hoursElapsed, isUrgent: hoursElapsed > 18 };
    };

    const editWindow = getEditWindowInfo();

    return (
        <div className="pb-32 page-enter">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-meridian-text tracking-normal">
                            {id ? 'Edit' : 'New'} {isHomeVisit ? 'Home Visit' : 'Visit'}
                        </h1>
                        <p className="text-sm text-meridian-sub mt-1 font-medium">Complete the field report below</p>
                    </div>

                    {/* Draft save button — always visible for drafts, hidden when locked */}
                    {!isLocked && (
                        <button
                            onClick={isDraft ? saveDraft : saveSubmittedChanges}
                            disabled={isSaving}
                            className="btn-outline shrink-0 flex items-center justify-center gap-2 py-2.5 sm:py-2 px-6 shadow-sm hover:shadow-md transition-all sm:w-auto w-full disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
                            ) : (
                                <Save className="w-4 h-4 text-brand-blue" />
                            )}
                            <span className="font-bold">{isDraft ? 'Save Draft' : 'Save Changes'}</span>
                        </button>
                    )}
                </div>

                {/* Locked banner — only for submitted visits past 24h */}
                {isLocked && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4 animate-shake">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl text-red-500 shadow-sm border border-red-50">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-red-800 uppercase tracking-tight leading-none mb-1">Visit Locked</h4>
                                <p className="text-xs text-red-600/70 font-bold">24h edit window has expired since submission. Contact admin to unlock.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={(unlockRequestSent && !isAdmin) || isSaving}
                            onClick={isAdmin ? () => toggleUnlock(true) : requestUnlock}
                            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${
                                (unlockRequestSent && !isAdmin)
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : isAdmin
                                    ? 'bg-brand-blue text-white shadow-brand-blue/20 hover:scale-105 active:scale-95'
                                    : 'bg-red-500 text-white shadow-red-500/20 hover:scale-105 active:scale-95'
                            }`}
                        >
                            {isAdmin ? 'ADMIN: UNLOCK' : unlockRequestSent ? 'Request Sent' : 'Request Unlock'}
                        </button>
                    </div>
                )}

                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Draft indicator */}
                    {isDraft && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl shadow-sm">
                            <FileText className="w-3.5 h-3.5" />
                            Draft — not submitted yet
                        </div>
                    )}

                    {/* Auto-save status */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white shadow-sm border border-slate-100 px-3 py-2 rounded-xl">
                        <div className={`w-2 h-2 rounded-full ${isDraft ? 'bg-amber-400' : 'bg-brand-sky'} animate-pulse`} />
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

                    {/* Status Badge — only for existing visits that are not drafts */}
                    {id && !isDraft && (
                        <div className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm transition-all ${
                            visitStatus === 'reviewed' ? 'bg-blue-50 text-brand-sky border-blue-100' :
                            visitStatus === 'action_required' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' :
                            visitStatus === 'closed' ? 'bg-green-50 text-brand-green border-green-100' :
                            visitStatus === 'submitted' ? 'bg-orange-50 text-brand-orange border-orange-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                visitStatus === 'reviewed' ? 'bg-brand-sky' :
                                visitStatus === 'action_required' ? 'bg-red-600' :
                                visitStatus === 'closed' ? 'bg-brand-green' :
                                visitStatus === 'submitted' ? 'bg-brand-orange' :
                                'bg-slate-400'
                            }`} />
                            {visitStatus === 'action_required' ? 'Action Needed' : visitStatus === 'submitted' ? 'Pending Review' : visitStatus}
                        </div>
                    )}
                </div>
            </div>

            {/* Action required alert */}
            {visitStatus === 'action_required' && (
                <div className="mb-6 p-4 bg-red-600 text-white rounded-2xl flex items-center gap-4 shadow-xl shadow-red-100 animate-bounce-subtle">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1 text-white">Action Required</h4>
                        <p className="text-[11px] font-bold text-white/90">Please refer to the Dashboard for specific admin instructions and update the flagged sections.</p>
                    </div>
                </div>
            )}

            {validationNotice && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-white rounded-xl text-red-500 shadow-sm border border-red-100 shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">{validationNotice.title}</h4>
                        <p className="text-xs font-bold text-red-700/80">{validationNotice.message}</p>
                    </div>
                </div>
            )}

            {/* Edit window notifications — only for submitted visits, NEVER for drafts */}
            {!isLocked && !isDraft && id && editWindow && (
                <div className="mb-6 space-y-3">
                    <div className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm transition-all ${
                        editWindow.isUrgent
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-brand-blue/5 border-brand-blue/10 text-brand-blue'
                    }`}>
                        <div className={`p-2 rounded-xl shrink-0 ${editWindow.isUrgent ? 'bg-white text-amber-600' : 'bg-white text-brand-blue'}`}>
                            {editWindow.isUrgent ? <ShieldAlert className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-1">
                                {editWindow.isUrgent ? 'Urgent — Edit Window Closing' : 'Edit Window Active'}
                            </h4>
                            <p className="text-xs font-bold opacity-80">
                                {editWindow.isUrgent
                                    ? `Only ${Math.ceil(editWindow.hoursLeft)}h left to make corrections before this visit locks.`
                                    : `You have ${Math.ceil(editWindow.hoursLeft)}h remaining to edit this submitted visit.`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Visit For — admin/superadmin only */}
            {isAdmin && assignableUsers.length > 0 && (
                <div className="mb-6 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-brand-blue" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Visit For</span>
                    </div>
                    <select
                        className="input-field flex-1 h-10"
                        value={forUser}
                        onChange={(e) => setForUser(e.target.value)}
                    >
                        <option value="">Self (default)</option>
                        {assignableUsers.map(u => (
                            <option key={u._id} value={u._id}>{u.name} ({u.employeeId})</option>
                        ))}
                    </select>
                    {forUser && (
                        <p className="text-xs text-brand-blue font-bold sm:shrink-0">
                            Visit will appear in this user&apos;s list
                        </p>
                    )}
                </div>
            )}

            {selectedAgentId && !isHomeVisit && (
                <div className="mb-6 max-w-4xl mx-auto">
                    <AgentHistoryCard
                        agentId={selectedAgentId}
                        agentName={selectedAgentName}
                        compact
                        onOpenItems={handleAgentOpenItems}
                    />
                </div>
            )}

            {/* Step Indicator */}
            <StepIndicator
                currentStep={currentStep}
                steps={groups.map(g => g.title || g)}
                errorSteps={adminNotes.filter(n => n.stepIndex !== undefined).map(n => n.stepIndex)}
            />

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-6 max-w-4xl mx-auto">
                <div className="card animate-fade-in p-5 sm:p-8 lg:p-10">
                    {/* Section Header */}
                    <div className="flex items-center gap-5 mb-8 pb-6 border-b border-meridian-border relative z-10">
                        <div className="w-12 h-12 rounded-lg bg-brand-gold flex items-center justify-center text-white font-black text-xl shadow-meridian-card shrink-0">
                            {currentStep + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-black text-meridian-text tracking-normal leading-none mb-1.5 truncate">{groups[currentStep]}</h3>
                            <p className="text-xs font-medium text-meridian-sub tracking-normal">
                                {isDraft ? 'Fill in the details — you can save as draft anytime' : 'Required details for this visit step'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-meridian-border shrink-0">
                            <span className="text-[10px] font-black text-meridian-sub uppercase tracking-widest">Step</span>
                            <span className="text-base font-black text-brand-gold">{currentStep + 1}</span>
                            <span className="text-sm font-bold text-slate-200">/</span>
                            <span className="text-sm font-bold text-slate-400">{groups.length}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7 relative z-10">
                        {config.fields
                            .filter(f => f.group === groups[currentStep])
                            .map(field => {
                                // Dynamic options for inquiryTypes based on Classification
                                let processedField = { ...field };
                                if (field.id === 'studentInfo.inquiryTypes') {
                                    const classification = watch('studentInfo.classification');
                                    if (classification === 'Onshore') {
                                        processedField.options = [
                                            'PR Process', 'Kanan Coaching', 'Canada Visitor Visa', 'Study Permit Extension', 
                                            'PGWP', 'Super Visa', 'USA Visitor Visa', 'ECA – WES', 'Spousal PR', 'All Immigration Services'
                                        ];
                                    } else if (classification === 'Offshore') {
                                        processedField.options = ['Kanan Coaching', 'Country Counselling', 'My Career Mentor'];
                                    } else {
                                        processedField.options = [];
                                    }
                                }

                                const mainField = (
                                    <React.Fragment key={`main_${processedField.id}`}>
                                        <DynamicField
                                            field={processedField}
                                            register={register}
                                            control={control}
                                            errors={errors}
                                            watch={watch}
                                            setValue={setValue}
                                            Controller={Controller}
                                            disabled={isLocked || disabledFields[field.id]}
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
                                                    disabled={isLocked}
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

                {/* Bottom navigation bar */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl z-40">
                    <div className="card flex items-center justify-between gap-2 p-2.5 sm:p-4">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="btn-outline flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 text-xs sm:text-sm disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="sm:inline hidden">Back</span>
                        </button>

                        {/* Mini segmented progress in bottom bar */}
                        <div className="flex items-center gap-1">
                            {groups.map((_, i) => (
                                <div
                                    key={i}
                                    className={`rounded-full transition-all duration-500 ${
                                        i === currentStep ? 'w-6 sm:w-8 h-1.5 bg-brand-gold shadow-sm' :
                                        i < currentStep ? 'w-1.5 h-1.5 bg-green-500' :
                                        'w-1.5 h-1.5 bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        {currentStep === groups.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit, onValidationError)}
                                disabled={isSaving || isLocked}
                                className="btn-primary flex items-center justify-center gap-2 px-5 sm:px-8 py-3 text-sm sm:text-base disabled:opacity-70 disabled:grayscale"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Submit</>}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="btn-primary flex items-center justify-center gap-2 px-5 sm:px-8 py-3 text-sm sm:text-base"
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

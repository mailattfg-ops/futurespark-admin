"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, Plus, Search, Loader2, AlertCircle, Trash2,
  AlertTriangle, Sparkles, X, User, RefreshCw, ChevronLeft, ChevronRight,
  ChevronDown, Layers, Play
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CustomSelect } from "@/components/ui/custom-select";

// ── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  parentAccount?: {
    id: string;
    email: string;
    programId?: string | null;
    paymentApproved?: boolean;
    selectedPlanType?: string | null;
    paidInstallmentIds?: string[];
  } | null;
}

interface Program {
  id: string;
  title: string;
}

interface Session {
  id: string;
  title: string;
  programId: string;
  durationMin: number;
  order: number;
  installmentId?: string | null;
}

interface MentorSchedule {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  scheduleType?: string;
}

interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  qualifiedPrograms: string[];
  mentorTypes: string[];
  mentorSchedules: MentorSchedule[];
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  demoClass: boolean;
  programId?: string | null;
  program?: {
    id: string;
    title: string;
  } | null;
  createdAt: string;
}

interface ScheduledClass {
  id: string;
  studentId: string;
  student: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  mentorId: string;
  mentor: {
    firstName: string;
    lastName: string;
    email: string;
  };
  scheduledBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  programId: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  status: string; // SCHEDULED, COMPLETED, CANCELLED
  classType?: string;
  leadId?: string | null;
  meetingLink?: string | null;
  createdAt: string;
}

export default function SchedulerPage() {
  const router = useRouter();

  // Master Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null); // For rescheduling / editing status
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [classDateTime, setClassDateTime] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [classStatus, setClassStatus] = useState("SCHEDULED");
  const [meetingLink, setMeetingLink] = useState("");
  const [updateAllMeetingLinks, setUpdateAllMeetingLinks] = useState(true);
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(false);
  const [recordingsList, setRecordingsList] = useState<any[]>([]);
  const [selectedClassForRecording, setSelectedClassForRecording] = useState<ScheduledClass | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [syncingRecording, setSyncingRecording] = useState(false);
  const [transcriptContentMap, setTranscriptContentMap] = useState<Record<string, string>>({});
  const [loadingTranscriptMap, setLoadingTranscriptMap] = useState<Record<string, boolean>>({});

  // Week start state for Google Calendar-style Grid
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day; // Sunday of this week
    return new Date(today.getFullYear(), today.getMonth(), diff);
  });

  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [activeTab, setActiveTab] = useState<"REGULAR" | "DEMO" | "RESCHEDULE">("REGULAR");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedClassType, setSelectedClassType] = useState<"REGULAR" | "DEMO">("REGULAR");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [resStuds, resProgs, resSess, resMents, resScheds, resLeads, resRecordings] = await Promise.all([
        fetch("/api/users/customers/students", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/courses/sessions", { headers }),
        fetch("/api/schedules/mentors", { headers }),
        fetch("/api/schedules", { headers }),
        fetch("/api/courses/leads", { headers }),
        fetch("/api/google/recordings", { headers }).catch(() => null), // fail-safe if service is not reachable
      ]);

      if (resStuds.status === 401 || resScheds.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("tokens");
        router.push("/login");
        return;
      }

      const dataStuds = await resStuds.json();
      const dataProgs = await resProgs.json();
      const dataSess = await resSess.json();
      const dataMents = await resMents.json();
      const dataScheds = await resScheds.json();
      const dataLeads = await resLeads.json();
      const dataRecordings = resRecordings ? await resRecordings.json() : { success: false, data: [] };

      if (
        !dataStuds.success ||
        !dataProgs.success ||
        !dataSess.success ||
        !dataMents.success ||
        !dataScheds.success ||
        !dataLeads.success
      ) {
        throw new Error("Failed to load scheduler resources from API.");
      }

      setStudents(dataStuds.data || []);
      setPrograms(dataProgs.data || []);
      setSessions(dataSess.data || []);
      setMentors(dataMents.data || []);
      setSchedules(dataScheds.data || []);
      setLeads(dataLeads.data || []);
      setRecordingsList(dataRecordings.success ? dataRecordings.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load scheduler directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Helpers & Filtering ────────────────────────────────────────────────────

  // Determine which sessions are unlocked for the selected student based on payment plan
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedStudentParent = selectedStudent?.parentAccount;
  const isInstallmentStudent =
    selectedStudentParent?.selectedPlanType === "INSTALLMENT" &&
    !selectedStudentParent?.paymentApproved;
  const paidInstallmentIds = selectedStudentParent?.paidInstallmentIds ?? [];

  // Get active sessions for the selected program — filtered by unlocked installments for installment students
  const activeSessions = sessions
    .filter((s) => s.programId === selectedProgramId)
    .filter((s) => {
      if (!isInstallmentStudent) return true; // Full pay / approved → all sessions
      if (!s.installmentId) return true; // Sessions not linked to any installment → always accessible
      return paidInstallmentIds.includes(s.installmentId); // Only unlocked installments
    });

  // Slot Grid Helper functions
  const goToPrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const formatToLocalISO = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const isSlotBooked = (slot: any, targetDate: Date) => {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const slotStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm);
    const slotEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), eh, em);

    return schedules.some((c) => {
      if (c.status === "CANCELLED") return false;
      if (c.mentorId !== slot.mentor.id) return false;

      const cStart = new Date(c.startTime);
      // Fallback: if endTime is missing/invalid, compute it as startTime + 90 min
      const cEndRaw = new Date(c.endTime);
      const cEnd = isNaN(cEndRaw.getTime())
        ? new Date(cStart.getTime() + 90 * 60 * 1000)
        : cEndRaw;

      return cStart < slotEnd && cEnd > slotStart;
    });
  };

  const isSlotSelected = (slot: any, targetDate: Date) => {
    if (!classDateTime || selectedMentorId !== slot.mentor.id) return false;
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const slotStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm);
    return classDateTime === formatToLocalISO(slotStart);
  };

  const handleSelectSlot = (slot: any, targetDate: Date) => {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const slotStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), sh, sm);
    setClassDateTime(formatToLocalISO(slotStart));
    setSelectedMentorId(slot.mentor.id);
  };

  // Get availability and qualification status for a mentor
  const getMentorStatus = (m: Mentor) => {
    if (!selectedProgramId || !classDateTime) return { qualified: true, available: true };
    const classDate = new Date(classDateTime);
    if (isNaN(classDate.getTime())) return { qualified: true, available: true };

    const classWeekday = classDate.getDay();
    const classStartMins = classDate.getHours() * 60 + classDate.getMinutes();
    const classEndMins = classStartMins + 90;

    const qualified = m.qualifiedPrograms.includes(selectedProgramId);
    const available = m.mentorSchedules.some((slot) => {
      if (slot.weekday !== classWeekday) return false;
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      return classStartMins >= slotStart && classEndMins <= slotEnd;
    });

    return { qualified, available };
  };

  // Check for immediate conflict alerts in the form
  const getConflictAlert = () => {
    if (!classDateTime) return null;
    const startTime = new Date(classDateTime);
    const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

    // Filter out the active class being rescheduled to prevent false self-conflict
    const otherClasses = schedules.filter(
      (c) => c.status !== "CANCELLED" && (!selectedClass || c.id !== selectedClass.id)
    );

    // Check mentor conflict
    if (selectedMentorId) {
      const conflict = otherClasses.find((c) => {
        if (c.mentorId !== selectedMentorId) return false;
        const cStart = new Date(c.startTime);
        const cEnd = new Date(c.endTime);
        return startTime < cEnd && endTime > cStart;
      });
      if (conflict) {
        const conflictingStudentName = conflict.student
          ? `${conflict.student.firstName} ${conflict.student.lastName}`
          : (() => {
              const lead = leads.find((l) => l.id === conflict.leadId);
              return lead ? `${lead.firstName} ${lead.lastName} (Lead)` : "a Lead";
            })();

        return {
          type: "MENTOR",
          message: `Conflict: This mentor already has a class scheduled at this time with ${conflictingStudentName}.`,
        };
      }
    }

    // Check student conflict
    if (selectedStudentId) {
      const conflict = otherClasses.find((c) => {
        if (c.studentId !== selectedStudentId) return false;
        const cStart = new Date(c.startTime);
        const cEnd = new Date(c.endTime);
        return startTime < cEnd && endTime > cStart;
      });
      if (conflict) {
        return {
          type: "STUDENT",
          message: `Conflict: This student is already scheduled for another class at this time with mentor ${conflict.mentor.firstName} ${conflict.mentor.lastName}.`,
        };
      }
    }

    // Check lead conflict
    if (selectedLeadId) {
      const conflict = otherClasses.find((c) => {
        if (c.leadId !== selectedLeadId) return false;
        const cStart = new Date(c.startTime);
        const cEnd = new Date(c.endTime);
        return startTime < cEnd && endTime > cStart;
      });
      if (conflict) {
        return {
          type: "STUDENT",
          message: `Conflict: This lead is already scheduled for another demo class at this time with mentor ${conflict.mentor.firstName} ${conflict.mentor.lastName}.`,
        };
      }
    }

    return null;
  };

  const conflictAlert = getConflictAlert();

  // ── Actions ────────────────────────────────────────────────────────────────

  const openScheduleModal = () => {
    setSelectedClass(null);
    setSelectedClassType("REGULAR");
    setSelectedLeadId(null);
    setSelectedStudentId("");
    setSelectedProgramId("");
    setSelectedSessionId("");
    setClassDateTime("");
    setSelectedMentorId("");
    setClassStatus("SCHEDULED");
    setMeetingLink("");
    setAutoGenerateMeet(false);
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), diff));
    setShowSlotPicker(false);
    setShowModal(true);
  };

  const openScheduleDemoModal = (lead: Lead) => {
    setSelectedClass(null);
    setSelectedClassType("DEMO");
    setSelectedLeadId(lead.id);
    setSelectedStudentId("");
    setSelectedProgramId(lead.programId || "");
    setSelectedSessionId("");
    setClassDateTime("");
    setSelectedMentorId("");
    setClassStatus("SCHEDULED");
    setMeetingLink("");
    setAutoGenerateMeet(false);
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), diff));
    setShowSlotPicker(false);
    setShowModal(true);
  };

  const openRescheduleModal = (c: ScheduledClass) => {
    setSelectedClass(c);
    setSelectedClassType(c.classType === "DEMO" ? "DEMO" : "REGULAR");
    setSelectedLeadId(c.leadId || null);
    setSelectedStudentId(c.studentId || "");
    setSelectedProgramId(c.programId);
    setSelectedSessionId(c.sessionId || "");
    // Format ISO string to datetime-local local input format (YYYY-MM-DDTHH:MM)
    const localDate = new Date(c.startTime);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const formatted = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setClassDateTime(formatted);
    setSelectedMentorId(c.mentorId);
    setClassStatus(c.status);
    setMeetingLink(c.meetingLink || "");
    setAutoGenerateMeet(false);
    
    // Set week starting date based on the class date
    const day = localDate.getDay();
    const diff = localDate.getDate() - day;
    setCurrentWeekStart(new Date(localDate.getFullYear(), localDate.getMonth(), diff));
    setShowSlotPicker(false);
    
    setShowModal(true);
  };

  const handleSaveClass = async (e: FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedClass;

    if (isEdit) {
      if (!classDateTime || !selectedMentorId) {
        setToast({ message: "Please select a date, time, and mentor.", type: "error" });
        return;
      }
    } else {
      if (selectedClassType === "DEMO") {
        if (!selectedLeadId || !selectedProgramId || !classDateTime || !selectedMentorId) {
          setToast({ message: "Please fill in all scheduling requirements.", type: "error" });
          return;
        }
      } else {
        if (!selectedStudentId || !selectedProgramId || !classDateTime || !selectedMentorId) {
          setToast({ message: "Please fill in all scheduling requirements.", type: "error" });
          return;
        }
      }
    }

    setActionLoading(true);
    try {
      const headers = getHeaders();
      let finalMeetingLink = meetingLink.trim() || null;

      // ⚡ Auto-generate Google Meet if checkbox is selected
      if (autoGenerateMeet && !isEdit) {
        const student = students.find((s) => s.id === selectedStudentId);
        const program = programs.find((p) => p.id === selectedProgramId);
        const mentor = mentors.find((m) => m.id === selectedMentorId);

        const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";
        const programName = program ? program.title : "Program";
        const mentorName = mentor ? `${mentor.firstName} ${mentor.lastName}` : "Mentor";

        const title = selectedClassType === "DEMO"
          ? `Demo Class - ${programName}`
          : `${programName} Session with ${studentName}`;

        const description = selectedClassType === "DEMO"
          ? `Demo Class Session with mentor ${mentorName}`
          : `Regular FutureSpark session with mentor ${mentorName} and student ${studentName}`;

        const startTimeIso = new Date(classDateTime).toISOString();
        const endTimeIso = new Date(new Date(classDateTime).getTime() + 90 * 60 * 1000).toISOString();

        // Build list of participant emails
        const attendees: string[] = [];
        if (mentor?.email) attendees.push(mentor.email);
        if (selectedClassType === "DEMO") {
          const lead = leads.find((l) => l.id === selectedLeadId);
          if (lead?.email) attendees.push(lead.email);
        } else {
          if (student?.email) attendees.push(student.email);
        }

        const googleRes = await fetch("/api/google/meetings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            workspaceEmail: "meetings.finquojunior@gmail.com",
            title,
            description,
            startTime: startTimeIso,
            endTime: endTimeIso,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            attendees,
            teacherId: selectedMentorId,
            studentId: selectedStudentId || selectedLeadId || "DEMO_STUDENT",
            programId: selectedProgramId,
            sessionId: selectedSessionId || "demo",
          }),
        });

        const googleData = await googleRes.json();
        if (!googleRes.ok || !googleData.success) {
          throw new Error(googleData.message || "Failed to auto-generate Google Meet link.");
        }

        finalMeetingLink = googleData.data.meetLink;
      }

      const url = isEdit ? `/api/schedules/${selectedClass.id}` : "/api/schedules";
      const method = isEdit ? "PUT" : "POST";

      const programSessions = sessions
        .filter((s) => s.programId === selectedProgramId)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ id: s.id, order: s.order }));

      const payload = isEdit
        ? { startTime: new Date(classDateTime).toISOString(), status: classStatus, mentorId: selectedMentorId, meetingLink: finalMeetingLink, updateAll: updateAllMeetingLinks }
        : selectedClassType === "DEMO"
        ? {
            leadId: selectedLeadId,
            mentorId: selectedMentorId,
            programId: selectedProgramId,
            startTime: new Date(classDateTime).toISOString(),
            classType: "DEMO",
            meetingLink: finalMeetingLink || undefined,
          }
        : {
            studentId: selectedStudentId,
            mentorId: selectedMentorId,
            programId: selectedProgramId,
            sessions: programSessions,
            startTime: new Date(classDateTime).toISOString(),
            classType: "REGULAR",
            meetingLink: finalMeetingLink || undefined,
          };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to schedule class.");
      }

      setShowModal(false);
      fetchData();
      setToast({ message: isEdit ? "Class rescheduled successfully." : "Class scheduled successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save schedule.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Scheduled Class",
      message: "Are you sure you want to permanently delete this scheduled class?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/schedules/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete schedule.");
          fetchData();
          setToast({ message: "Scheduled class deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete schedule.", type: "error" });
        }
      },
    });
  };

  const handleSyncRecording = async () => {
    if (!selectedClassForRecording) return;
    setSyncingRecording(true);
    try {
      const program = programs.find((p) => p.id === selectedClassForRecording.programId);
      const programTitle = program ? program.title : "Program";

      // 1. Sync manual meeting metadata first
      const syncMeetRes = await fetch("/api/google/meetings/sync-manual", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          meetingLink: selectedClassForRecording.meetingLink,
          title: `${selectedClassForRecording.classType === 'DEMO' ? 'Demo' : 'Regular'} Class - ${programTitle}`,
          startTime: selectedClassForRecording.startTime,
          endTime: selectedClassForRecording.endTime,
          organizerEmail: "meetings.finquojunior@gmail.com",
          teacherId: selectedClassForRecording.mentorId,
          studentId: selectedClassForRecording.studentId || selectedClassForRecording.leadId || "DEMO_STUDENT",
          programId: selectedClassForRecording.programId,
          sessionId: selectedClassForRecording.sessionId || "demo",
        }),
      });

      const syncMeetData = await syncMeetRes.json();
      if (!syncMeetRes.ok || !syncMeetData.success) {
        throw new Error(syncMeetData.message || "Failed to link class meeting metadata.");
      }

      // 2. Trigger Google Drive recording sync check
      const syncRecRes = await fetch("/api/google/recordings/sync", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ meetingId: syncMeetData.data.id }),
      });

      const syncRecData = await syncRecRes.json();
      if (!syncRecRes.ok || !syncRecData.success) {
        throw new Error(syncRecData.message || "No matching recording found on Google Drive yet.");
      }

      setToast({ message: "Recording synced successfully from Google Drive!", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message || "Recording not found on Google Drive.", type: "error" });
    } finally {
      setSyncingRecording(false);
    }
  };

  const handleDownloadVideo = async (recId: string) => {
    setSyncingRecording(true);
    try {
      const res = await fetch(`/api/google/recordings/${recId}/download`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to download recording file to server.");
      }
      setToast({ message: "Video download started/completed on server!", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSyncingRecording(false);
    }
  };

  const handleExtractAudio = async (recId: string) => {
    setSyncingRecording(true);
    try {
      const res = await fetch(`/api/google/recordings/${recId}/extract-audio`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ format: "mp3" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Audio extraction job failed on server.");
      }
      setToast({ message: "Audio track extracted successfully!", type: "success" });
      fetchData();
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSyncingRecording(false);
    }
  };

  const loadTranscriptContent = async (recId: string) => {
    setLoadingTranscriptMap((prev) => ({ ...prev, [recId]: true }));
    try {
      const res = await fetch(`/api/google/recordings/${recId}/transcript`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTranscriptContentMap((prev) => ({ ...prev, [recId]: data.data.content }));
      } else {
        setToast({ message: data.message || "Failed to load transcript text content.", type: "error" });
      }
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoadingTranscriptMap((prev) => ({ ...prev, [recId]: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const filteredSchedules = schedules.filter((c) => {
    const lead = leads.find((l) => l.id === c.leadId);
    const studentName = c.student
      ? `${c.student.firstName} ${c.student.lastName}`.toLowerCase()
      : lead
      ? `${lead.firstName} ${lead.lastName}`.toLowerCase()
      : "";
    const mentorName = `${c.mentor.firstName} ${c.mentor.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = studentName.includes(query) || mentorName.includes(query);

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesProgram = programFilter === "All" || c.programId === programFilter;

    return matchesSearch && matchesStatus && matchesProgram;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc] mb-3" />
        <p className="text-white/40 text-sm">Loading Scheduling Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#7c5cfc]" /> Scheduling Engine
          </h1>
          <p className="text-white/45 text-sm mt-1">
            Map qualified mentors to student learning sessions and resolve calendar conflicts.
          </p>
        </div>
        <button
          onClick={openScheduleModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c5cfc] hover:bg-[#6c4be8] text-white text-xs font-bold transition-all shadow-lg hover:shadow-[#7c5cfc]/20"
        >
          <Plus className="w-4 h-4" /> Schedule A Class
        </button>
      </div>

      {/* Switch Tab Buttons */}
      <div className="flex border-b border-white/[0.08] gap-6 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("REGULAR");
          }}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "REGULAR"
              ? "border-[#7c5cfc] text-[#7c5cfc]"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          Regular Schedules
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("DEMO");
          }}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "DEMO"
              ? "border-[#7c5cfc] text-[#7c5cfc]"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          Demo Schedules & Requests
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("RESCHEDULE");
          }}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "RESCHEDULE"
              ? "border-[#7c5cfc] text-[#7c5cfc]"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          Reschedule
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            type="text"
            placeholder="Search by student or mentor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#7c5cfc] focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {/* Program filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-4 py-2 text-xs text-white/70 focus:border-[#7c5cfc] focus:outline-none"
            >
              <option value="All">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-4 py-2 text-xs text-white/70 focus:border-[#7c5cfc] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === "REGULAR" ? (
        (() => {
          const regularFiltered = filteredSchedules.filter((c) => c.classType === "REGULAR" || !c.classType);

          interface GroupedProgram {
            programId: string;
            programTitle: string;
            createdAt: string;
            classes: ScheduledClass[];
          }

          const groupedMap = new Map<
            string,
            {
              id: string;
              studentId: string;
              student: Student;
              programs: GroupedProgram[];
            }
          >();

          regularFiltered.forEach((c) => {
            if (!c.student) return;
            
            const studentId = c.studentId || "";
            if (!groupedMap.has(studentId)) {
              groupedMap.set(studentId, {
                id: studentId,
                studentId,
                student: {
                  id: studentId,
                  firstName: c.student.firstName,
                  lastName: c.student.lastName,
                  email: c.student.email,
                },
                programs: [],
              });
            }

            const studentGroup = groupedMap.get(studentId)!;
            const cTime = new Date(c.createdAt).getTime();

            let progGroup = studentGroup.programs.find((p) => {
              if (p.programId === c.programId) {
                const groupTime = new Date(p.createdAt).getTime();
                return Math.abs(cTime - groupTime) < 15000; // 15 seconds tolerance for transaction batching
              }
              return false;
            });

            if (!progGroup) {
              const program = programs.find((p) => p.id === c.programId);
              const programTitle = program?.title || "Unknown Program";
              progGroup = {
                programId: c.programId,
                programTitle,
                createdAt: c.createdAt,
                classes: [],
              };
              studentGroup.programs.push(progGroup);
            }
            progGroup.classes.push(c);
          });

          const groupedData = Array.from(groupedMap.values());
          
          // Sort programs by title, and sort each program's classes chronologically by startTime
          groupedData.forEach((g) => {
            g.programs.sort((a, b) => a.programTitle.localeCompare(b.programTitle));
            g.programs.forEach((p) => {
              p.classes.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            });
          });

          const columns: DataTableColumn<typeof groupedData[number]>[] = [
            {
              key: "student",
              header: "Student",
              cellClassName: "align-top min-w-[200px] py-4",
              cell: (g) => (
                <div className="py-1">
                  <div className="font-semibold text-white text-xs">
                    {g.student.firstName} {g.student.lastName}
                  </div>
                  <div className="text-[10px] text-white/30 font-medium mt-1">{g.student.email}</div>
                </div>
              ),
            },
            {
              key: "programs",
              header: "Scheduled Programs & Timelines",
              cellClassName: "align-top min-w-[550px] py-4",
              cell: (g) => (
                <div className="flex flex-col gap-3 py-1 w-full">
                  {g.programs.map((p, pIdx) => {
                    const expandKey = `${g.id}-${p.programId}-${p.createdAt}`;
                    const isExpanded = !!expandedPrograms[expandKey];

                    // Find all unique mentors in this program schedule
                    const mentorsList = Array.from(
                      new Set(p.classes.map((c) => c.mentor ? `${c.mentor.firstName} ${c.mentor.lastName}` : "").filter(Boolean))
                    );
                    const mentorsStr = mentorsList.length > 0 ? mentorsList.join(", ") : "Unassigned";

                    return (
                      <div key={pIdx} className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-4 w-full transition-all">
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/[0.04] pb-3.5 mb-3.5">
                          <div>
                            <h4 className="text-xs font-bold text-white/95">{p.programTitle}</h4>
                            <div className="text-[10px] text-white/40 mt-1.5 font-medium flex items-center gap-1.5">
                              <span>{p.classes.length} session{p.classes.length !== 1 ? "s" : ""} scheduled</span>
                              <span>•</span>
                              <span className="text-[#a78bfa]">Mentor: {mentorsStr}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPrograms((prev) => ({ ...prev, [expandKey]: !isExpanded }));
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] rounded-xl text-[10px] font-bold text-[#7c5cfc] hover:text-[#6c4be8] transition-all self-start sm:self-center"
                          >
                            {isExpanded ? "Hide Sessions" : `View Sessions (${p.classes.length})`}
                          </button>
                        </div>

                        {/* Card Timeline Body */}
                        {isExpanded && (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto w-full transition-all pr-1">
                            {p.classes.map((c) => {
                              const session = sessions.find((s) => s.id === c.sessionId);
                              const classDate = new Date(c.startTime);

                              return (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between gap-3 p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-white/80 block truncate">
                                      Session {session?.order || "-"}: {session?.title || "Curriculum"}
                                    </span>
                                    <div className="text-white/40 mt-0.5 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                      <span>
                                        {classDate.toLocaleDateString("en-GB", {
                                          weekday: "short",
                                          day: "2-digit",
                                          month: "short",
                                        })}{" "}
                                        @ {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      <span className="text-white/20 hidden sm:inline">•</span>
                                      <span className="text-[#a78bfa] font-semibold">
                                        Mentor: {c.mentor ? `${c.mentor.firstName} ${c.mentor.lastName}` : "Unassigned"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {c.meetingLink && (() => {
                                      const startTimeMs = classDate.getTime();
                                      const endTimeMs = c.endTime ? new Date(c.endTime).getTime() : startTimeMs + 90 * 60 * 1000;
                                      const thirtyMinsBeforeMs = startTimeMs - 30 * 60 * 1000;
                                      const canJoin = now >= thirtyMinsBeforeMs && now <= endTimeMs;
                                      const isTooEarly = now < thirtyMinsBeforeMs;

                                      if (canJoin) {
                                        return (
                                          <a
                                            href={c.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#00d4aa]/15 border border-[#00d4aa]/40 text-[#00d4aa] hover:bg-[#00d4aa]/25 transition-all flex items-center gap-0.5 uppercase tracking-wide"
                                            title={c.meetingLink}
                                          >
                                            🔗 Join
                                          </a>
                                        );
                                      } else if (isTooEarly) {
                                        return (
                                          <span
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-white/[0.02] border border-white/[0.06] text-white/30 cursor-not-allowed uppercase tracking-wide"
                                            title="Opens 30 minutes before class"
                                          >
                                            ⏰ Early
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-white/[0.01] border border-white/[0.03] text-white/20 cursor-not-allowed uppercase tracking-wide"
                                            title="Session ended"
                                          >
                                            Ended
                                          </span>
                                        );
                                      }
                                    })()}
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                        c.status === "COMPLETED"
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                          : c.status === "CANCELLED"
                                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                      }`}
                                    >
                                      {c.status}
                                    </span>
                                    {c.meetingLink && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedClassForRecording(c);
                                          setShowRecordingModal(true);
                                        }}
                                        className="p-1 hover:text-[#00d4aa] text-white/30 transition-colors"
                                        title="View Meeting Recording"
                                      >
                                        <Play className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRescheduleModal(c);
                                      }}
                                      className="p-1 hover:text-[#7c5cfc] text-white/30 transition-colors"
                                      title="Reschedule Session"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClass(c.id);
                                      }}
                                      className="p-1 hover:text-red-400 text-white/20 transition-colors"
                                      title="Delete Session"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ),
            },
          ];

          return (
            <DataTable
              columns={columns}
              data={groupedData}
              emptyState={
                <span className="text-xs text-white/30 italic">
                  No scheduled classes matching your filters.
                </span>
              }
            />
          );
        })()
      ) : activeTab === "DEMO" ? (
        <div className="space-y-10">
          {/* Section 1: Pending Demo Requests */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00d4aa]" /> Pending Demo Requests
            </h3>
            {(() => {
              const demoRequests = leads.filter(
                (lead) => lead.demoClass && !schedules.some((c) => c.classType === "DEMO" && c.leadId === lead.id && c.status !== "CANCELLED")
              );

              const reqColumns: DataTableColumn<Lead>[] = [
                {
                  key: "leadName",
                  header: "Lead Student",
                  cell: (l) => (
                    <div>
                      <div className="font-semibold text-white text-xs">{l.firstName} {l.lastName}</div>
                      <div className="text-[10px] text-white/30 font-medium">{l.email}</div>
                    </div>
                  ),
                },
                {
                  key: "leadProgram",
                  header: "Requested Program",
                  cell: (l) => (
                    <span className="text-[11px] text-[#7c5cfc] bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 px-2 py-0.5 rounded-lg font-medium">
                      {l.program?.title || "General Interest"}
                    </span>
                  ),
                },
                {
                  key: "requestedAt",
                  header: "Request Date",
                  cell: (l) => (
                    <span className="text-white/40 font-medium">
                      {new Date(l.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  ),
                },
                {
                  key: "action",
                  header: <span className="block text-right">Action</span>,
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  cell: (l) => (
                    <button
                      type="button"
                      onClick={() => openScheduleDemoModal(l)}
                      className="px-3.5 py-1.5 bg-[#00d4aa]/10 hover:bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/20 hover:border-[#00d4aa]/40 rounded-xl text-[10px] font-bold tracking-wide transition-all shadow-md"
                    >
                      Schedule Demo
                    </button>
                  ),
                },
              ];

              return (
                <DataTable
                  columns={reqColumns}
                  data={demoRequests}
                  emptyState={
                    <span className="text-xs text-white/30 italic">
                      No pending demo class requests from Leads.
                    </span>
                  }
                />
              );
            })()}
          </div>

          {/* Section 2: Scheduled Demo Classes */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#7c5cfc]" /> Scheduled Demo Classes
            </h3>
            {(() => {
              const demoScheds = filteredSchedules.filter((c) => c.classType === "DEMO");

              const schedColumns: DataTableColumn<ScheduledClass>[] = [
                {
                  key: "leadStudent",
                  header: "Lead Student",
                  cell: (c) => {
                    const lead = leads.find((l) => l.id === c.leadId);
                    return (
                      <div>
                        <div className="font-semibold text-white text-xs">
                          {lead ? `${lead.firstName} ${lead.lastName}` : "Unknown Lead"}
                        </div>
                        <div className="text-[10px] text-white/30 font-medium">{lead ? lead.email : "-"}</div>
                      </div>
                    );
                  },
                },
                {
                  key: "program",
                  header: "Program Topic",
                  cell: (c) => {
                    const program = programs.find((p) => p.id === c.programId);
                    return (
                      <span className="text-[11px] text-[#7c5cfc] bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 px-2 py-0.5 rounded-lg font-medium">
                        {program?.title || "General Interest"}
                      </span>
                    );
                  },
                },
                {
                  key: "mentor",
                  header: "Assigned Mentor",
                  cell: (c) => (
                    <div>
                      <div className="font-semibold text-white/80 text-xs">
                        {c.mentor.firstName} {c.mentor.lastName}
                      </div>
                      <div className="text-[10px] text-white/30 font-medium">{c.mentor.email}</div>
                    </div>
                  ),
                },
                {
                  key: "datetime",
                  header: "Date & Time",
                  cell: (c) => {
                    const classDate = new Date(c.startTime);
                    return (
                      <div>
                        <div className="flex items-center gap-1.5 text-white/80 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[#00d4aa]" />
                          {classDate.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-white/40 mt-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(classDate.getTime() + 90 * 60 * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "meetingLink",
                  header: "Meeting Link",
                  cell: (c) => {
                    if (!c.meetingLink) {
                      return (
                        <span className="text-[10px] text-white/20 italic">No Link</span>
                      );
                    }
                    const startTimeMs = new Date(c.startTime).getTime();
                    const endTimeMs = c.endTime ? new Date(c.endTime).getTime() : startTimeMs + 90 * 60 * 1000;
                    const thirtyMinsBeforeMs = startTimeMs - 30 * 60 * 1000;
                    const canJoin = now >= thirtyMinsBeforeMs && now <= endTimeMs;
                    const isTooEarly = now < thirtyMinsBeforeMs;

                    return (
                      <div className="flex items-center gap-2">
                        {canJoin ? (
                          <a
                            href={c.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-[#00d4aa]/15 hover:bg-[#00d4aa]/25 border border-[#00d4aa]/30 hover:border-[#00d4aa]/50 text-[#00d4aa] text-[9px] font-bold tracking-wide transition-all inline-flex items-center gap-1 uppercase"
                            title={c.meetingLink}
                          >
                            🔗 Join
                          </a>
                        ) : isTooEarly ? (
                          <span
                            className="px-2 py-1 rounded bg-white/[0.02] border border-white/[0.06] text-white/30 text-[9px] font-semibold uppercase tracking-wide cursor-not-allowed"
                            title="Opens 30 minutes before class"
                          >
                            ⏰ Early
                          </span>
                        ) : (
                          <span
                            className="px-2 py-1 rounded bg-white/[0.01] border border-white/[0.03] text-white/20 text-[9px] font-semibold uppercase tracking-wide cursor-not-allowed"
                            title="Session ended"
                          >
                            Ended
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassForRecording(c);
                            setShowRecordingModal(true);
                          }}
                          className="px-2 py-1 rounded bg-[#00d4aa]/10 hover:bg-[#00d4aa]/20 border border-[#00d4aa]/20 hover:border-[#00d4aa]/40 text-[#00d4aa] text-[9px] font-bold tracking-wide transition-all inline-flex items-center gap-1 uppercase"
                          title="View Recording"
                        >
                          🎥 Recording
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(c.meetingLink || "");
                            setToast({ message: "Meeting link copied to clipboard!", type: "success" });
                          }}
                          className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white text-[9px] font-bold tracking-wide transition-all inline-flex items-center gap-1 uppercase"
                          title="Copy link to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (c) => (
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                        c.status === "COMPLETED"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : c.status === "CANCELLED"
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: <span className="block text-right">Actions</span>,
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  cell: (c) => (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openRescheduleModal(c)}
                        className="text-white/40 hover:text-[#7c5cfc] font-semibold transition-all inline-flex items-center gap-1 text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                      </button>
                      <button
                        onClick={() => handleDeleteClass(c.id)}
                        className="text-white/20 hover:text-red-400 transition-all inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
                },
              ];

              return (
                <DataTable
                  columns={schedColumns}
                  data={demoScheds}
                  emptyState={
                    <span className="text-xs text-white/30 italic">
                      No scheduled demo classes.
                    </span>
                  }
                />
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {(() => {
            // Sort classes chronologically by startTime
            const sortedSchedules = [...filteredSchedules].sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );

            const rescheduleRequests = sortedSchedules.filter((c) => c.status === "RESCHEDULE_REQUESTED");

            const rescheduleColumns: DataTableColumn<ScheduledClass>[] = [
              {
                key: "student",
                header: "Participant Name",
                cell: (c) => {
                  if (c.classType === "DEMO") {
                    const lead = leads.find((l) => l.id === c.leadId);
                    return (
                      <div>
                        <div className="font-semibold text-[#00d4aa] text-xs">
                          {lead ? `${lead.firstName} ${lead.lastName}` : "Unknown Lead"}
                        </div>
                        <div className="text-[10px] text-white/35 font-medium">
                          {lead ? lead.email : "-"} <span className="text-[8px] bg-[#00d4aa]/15 text-[#00d4aa] px-1 rounded font-bold ml-1 uppercase">Lead</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <div className="font-semibold text-white text-xs">
                        {c.student ? `${c.student.firstName} ${c.student.lastName}` : "Unknown Student"}
                      </div>
                      <div className="text-[10px] text-white/35 font-medium">
                        {c.student ? c.student.email : "-"}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "classType",
                header: "Type",
                cell: (c) => (
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                      c.classType === "DEMO"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}
                  >
                    {c.classType === "DEMO" ? "Demo" : "Regular"}
                  </span>
                ),
              },
              {
                key: "program",
                header: "Program / Topic",
                cell: (c) => {
                  const program = programs.find((p) => p.id === c.programId);
                  const session = sessions.find((s) => s.id === c.sessionId);
                  return (
                    <div>
                      <div className="font-semibold text-white/85 text-xs">
                        {program ? program.title : "Unknown Program"}
                      </div>
                      {c.classType !== "DEMO" && session && (
                        <div className="text-[10px] text-white/40 mt-0.5 font-medium">
                          Session {session.order}: {session.title}
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "mentor",
                header: "Assigned Mentor",
                cell: (c) => (
                  <div>
                    <div className="font-semibold text-white/80 text-xs">
                      {c.mentor.firstName} {c.mentor.lastName}
                    </div>
                    <div className="text-[10px] text-white/35 font-medium">{c.mentor.email}</div>
                  </div>
                ),
              },
              {
                key: "datetime",
                header: "Date & Time",
                cell: (c) => {
                  const classDate = new Date(c.startTime);
                  return (
                    <div>
                      <div className="flex items-center gap-1.5 text-white/85 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[#7c5cfc]" />
                        {classDate.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/45 mt-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(classDate.getTime() + 90 * 60 * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "status",
                header: "Status",
                cell: (c) => (
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                      c.status === "COMPLETED"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : c.status === "CANCELLED"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : c.status === "RESCHEDULE_REQUESTED"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}
                  >
                    {c.status === "RESCHEDULE_REQUESTED" ? "Reschedule Requested" : c.status}
                  </span>
                ),
              },
              {
                key: "actions",
                header: <span className="block text-right">Actions</span>,
                headerClassName: "text-right",
                cellClassName: "text-right",
                cell: (c) => (
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openRescheduleModal(c)}
                      className="px-3 py-1.5 bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 text-[#7c5cfc] border border-[#7c5cfc]/20 hover:border-[#7c5cfc]/40 rounded-xl text-[10px] font-bold tracking-wide transition-all shadow-md flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Reschedule
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="text-white/20 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ];

            return (
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" /> Reschedule Requests Only
                </h3>
                <DataTable
                  columns={rescheduleColumns}
                  data={rescheduleRequests}
                  emptyState={
                    <span className="text-xs text-white/30 italic">
                      No pending reschedule requests.
                    </span>
                  }
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal: Schedule / Reschedule Class */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#080a10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#7c5cfc]" />
                {selectedClass ? "Reschedule / Edit Status" : "Schedule New Learning Session"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              {/* Student Dropdown (Only for Create) */}
              {/* Student Dropdown (Only for Create) */}
              {!selectedClass ? (
                selectedClassType === "DEMO" && selectedLeadId ? (
                  <div>
                    <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                      Lead Student (Demo Class)
                    </label>
                    <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/25 rounded-xl px-3.5 py-2 text-xs text-[#00d4aa] font-bold">
                      {(() => {
                        const lead = leads.find((l) => l.id === selectedLeadId);
                        return lead ? `${lead.firstName} ${lead.lastName} (${lead.email})` : "Loading Lead...";
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                      Select Student
                    </label>
                    <CustomSelect
                      value={selectedStudentId}
                      placeholder="-- Choose Student --"
                      options={students
                        .filter((s) => {
                          const pa = s.parentAccount;
                          if (!pa?.programId) return false;
                          // Full payment: must be approved
                          if (pa.selectedPlanType === "FULL") return !!pa.paymentApproved;
                          // Installment: eligible if at least one installment paid
                          if (pa.selectedPlanType === "INSTALLMENT") return (pa.paidInstallmentIds?.length ?? 0) > 0;
                          // Legacy: fallback to paymentApproved flag
                          return !!pa.paymentApproved;
                        })
                        .map((s) => {
                          const pa = s.parentAccount;
                          const isInstallment = pa?.selectedPlanType === "INSTALLMENT";
                          const paidCount = pa?.paidInstallmentIds?.length ?? 0;
                          const subLabel = isInstallment && !pa?.paymentApproved
                            ? `${s.email} · ${paidCount} installment${paidCount !== 1 ? "s" : ""} paid`
                            : s.email;
                          return {
                            value: s.id,
                            label: `${s.firstName} ${s.lastName}`,
                            subLabel,
                          };
                        })}
                      onChange={(val) => {
                        setSelectedStudentId(val);
                        if (selectedClassType === "REGULAR") {
                          const student = students.find((s) => s.id === val);
                          const progId = student?.parentAccount?.programId || "";
                          setSelectedProgramId(progId);
                          setSelectedSessionId("");
                          setSelectedMentorId("");
                        }
                      }}
                    />
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Student
                  </label>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white/50 font-medium">
                    {(() => {
                      if (selectedClass.classType === "DEMO") {
                        const lead = leads.find((l) => l.id === selectedClass.leadId);
                        return lead ? `${lead.firstName} ${lead.lastName} (Lead)` : "Unknown Lead";
                      }
                      return selectedClass.student
                        ? `${selectedClass.student.firstName} ${selectedClass.student.lastName}`
                        : "Unknown Student";
                    })()}
                  </div>
                </div>
              )}

              {/* Program Display (Read-Only) */}
              {!selectedClass ? (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5 flex justify-between items-center">
                    <span>Subject Program</span>
                    {selectedClassType === "DEMO" && selectedLeadId && (
                      <span className="text-[9px] text-[#00d4aa] font-bold normal-case">
                        Lead Requested: {(() => {
                          const lead = leads.find((l) => l.id === selectedLeadId);
                          const prog = programs.find((p) => p.id === lead?.programId);
                          return prog ? prog.title : "General Interest";
                        })()}
                      </span>
                    )}
                  </label>
                  {selectedClassType === "DEMO" ? (
                    !selectedProgramId ? (
                      <CustomSelect
                        value={selectedProgramId}
                        placeholder="-- Select Subject Program --"
                        options={programs.map((p) => ({
                          value: p.id,
                          label: p.title,
                        }))}
                        onChange={(val) => {
                          setSelectedProgramId(val);
                          setClassDateTime("");
                          setSelectedMentorId("");
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white/50 font-medium">
                        <span>{programs.find((p) => p.id === selectedProgramId)?.title || "General Interest"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgramId("");
                            setClassDateTime("");
                            setSelectedMentorId("");
                          }}
                          className="text-[10px] text-[#7c5cfc] hover:text-[#6c4be8] font-bold"
                        >
                          Change
                        </button>
                      </div>
                    )
                  ) : selectedStudentId ? (
                    !selectedProgramId ? (
                      <CustomSelect
                        value={selectedProgramId}
                        placeholder="-- Select Subject Program --"
                        options={programs.map((p) => ({
                          value: p.id,
                          label: p.title,
                        }))}
                        onChange={(val) => {
                          setSelectedProgramId(val);
                          setSelectedSessionId("");
                          setClassDateTime("");
                          setSelectedMentorId("");
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 rounded-xl px-3.5 py-2 text-xs text-[#a78bfa] font-bold">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#7c5cfc] animate-pulse" />
                          <span>{programs.find((p) => p.id === selectedProgramId)?.title || "General Interest"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgramId("");
                            setSelectedSessionId("");
                            setClassDateTime("");
                            setSelectedMentorId("");
                          }}
                          className="text-[10px] text-[#7c5cfc] hover:text-[#6c4be8] font-bold text-right"
                        >
                          Change
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-xl px-3.5 py-2 text-xs text-white/30 italic">
                      Please select a student first to load their subscribed program
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Program & Session
                  </label>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white/50 font-medium">
                    {programs.find((p) => p.id === selectedClass.programId)?.title || "General Interest"}
                    {selectedClass.classType !== "DEMO" && (
                      <> (Session {sessions.find((s) => s.id === selectedClass.sessionId)?.order})</>
                    )}
                  </div>
                </div>
              )}

              {/* Date & Time Picker / Mentor Selection */}
              {selectedClass ? (
                <>
                  <div>
                    <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                      Class Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={classDateTime}
                      onChange={(e) => {
                        setClassDateTime(e.target.value);
                      }}
                      required
                      className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                    />
                  </div>

                  {/* Mentor selection */}
                  <div>
                    <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5 flex items-center justify-between">
                      <span>Change Mentor</span>
                    </label>
                    <CustomSelect
                      value={selectedMentorId}
                      placeholder="-- Select Mentor --"
                      options={mentors.map((m) => {
                        const status = getMentorStatus(m);
                        const tags: string[] = [];
                        if (!status.qualified) tags.push("not qualified");
                        if (!status.available) tags.push("outside availability");
                        const suffix = tags.length > 0 ? ` (${tags.join(" | ")})` : "";
                        return {
                          value: m.id,
                          label: `${m.firstName} ${m.lastName}${suffix}`,
                          subLabel: m.email,
                        };
                      })}
                      onChange={(val) => setSelectedMentorId(val)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide">
                    Class Schedule & Mentor assignment
                  </label>
                  
                  {/* Installment unlock status banner */}
                  {isInstallmentStudent && selectedProgramId && (
                    <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Installment Plan · {paidInstallmentIds.length} paid
                        </span>
                      </div>
                      <div className="space-y-1">
                        {activeSessions.length > 0 ? (
                          activeSessions.map((s) => (
                            <div key={s.id} className="flex items-center gap-1.5 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-emerald-400 font-medium">
                                S{s.order}: {s.title}
                              </span>
                              <span className="text-white/25 text-[9px]">unlocked</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-amber-400/70 italic">
                            No sessions unlocked yet. Parent must pay at least one installment.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!selectedProgramId ? (

                    <div className="bg-[#13161e] border border-white/[0.07] rounded-xl px-4 py-3 text-xs text-white/30 text-center italic">
                      Please select a subject program first to view available slots.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowSlotPicker(true)}
                        className="w-full py-3 bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 hover:bg-[#7c5cfc]/20 hover:border-[#7c5cfc]/50 text-xs font-bold text-[#7c5cfc] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#7c5cfc]/5"
                      >
                        <Calendar className="w-4 h-4" /> Find Available Slots (Weekly Grid)
                      </button>

                      {/* Display the selected details summary banner */}
                      {classDateTime && selectedMentorId ? (
                        <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/25 rounded-xl p-3.5 text-xs text-white/90 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 mb-2">
                            <span className="font-extrabold text-[#00d4aa] uppercase tracking-wider text-[9px]">
                              Assigned Schedule Details
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setClassDateTime("");
                                setSelectedMentorId("");
                              }}
                              className="text-[9px] text-white/35 hover:text-red-400 font-semibold"
                            >
                              Reset Choice
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div className="min-w-[120px]">
                              <span className="text-[9px] text-white/35 block uppercase tracking-wider">
                                Class Date & Day
                              </span>
                              <span className="font-semibold block mt-0.5 text-white/80">
                                {new Date(classDateTime).toLocaleDateString("en-GB", {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="min-w-[70px]">
                              <span className="text-[9px] text-white/35 block uppercase tracking-wider">
                                Start Time
                              </span>
                              <span className="font-bold text-white block mt-0.5 text-xs">
                                {new Date(classDateTime).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/35 block uppercase tracking-wider">
                                Assigned Mentor
                              </span>
                              <span className="font-semibold text-[#60a5fa] block mt-0.5">
                                {(() => {
                                  const m = mentors.find((m) => m.id === selectedMentorId);
                                  return m ? `${m.firstName} ${m.lastName}` : "-";
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/30 bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-3 text-center">
                          No slot selected yet. Click the button above to select.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Meeting Link (Google Meet / Zoom / WebRTC) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide flex items-center gap-1.5">
                    🔗 Meeting Link (Optional)
                  </label>
                  {!selectedClass && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoGenerateMeet}
                        onChange={(e) => {
                          setAutoGenerateMeet(e.target.checked);
                          if (e.target.checked) setMeetingLink("");
                        }}
                        className="w-3.5 h-3.5 rounded accent-[#7c5cfc]"
                      />
                      <span className="text-[9px] text-[#7c5cfc] font-bold uppercase tracking-wide">
                        ⚡ Auto-Generate Google Meet
                      </span>
                    </label>
                  )}
                </div>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  disabled={autoGenerateMeet}
                  placeholder={autoGenerateMeet ? "Google Meet link will be generated automatically..." : "https://meet.google.com/abc-defg-hij"}
                  className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:border-[#00d4aa] focus:outline-none transition-all disabled:opacity-50"
                />
                {meetingLink && (
                  <a
                    href={meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] text-[#00d4aa] hover:underline mt-1 ml-0.5"
                  >
                    ✓ Preview link →
                  </a>
                )}
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updateAllMeetingLinks}
                    onChange={(e) => setUpdateAllMeetingLinks(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#00d4aa]"
                  />
                  <span className="text-[10px] text-[#00d4aa] font-semibold">
                    Apply this Meeting Link to all sessions in this program
                  </span>
                </label>
              </div>

              {/* Status Selector (Only for Rescheduling / Editing) */}
              {selectedClass && (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Class Status
                  </label>
                    <CustomSelect
                      value={classStatus}
                      options={[
                        { value: "SCHEDULED", label: "Scheduled" },
                        { value: "COMPLETED", label: "Completed" },
                        { value: "CANCELLED", label: "Cancelled" },
                      ]}
                      onChange={(val) => setClassStatus(val)}
                    />
                </div>
              )}

              {/* Overlaps & Conflict Warnings (dynamic UI checks) */}
              {conflictAlert && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl p-3 flex items-start gap-1.5 leading-normal">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{conflictAlert.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/[0.06] mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] text-white/70 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !!conflictAlert}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6c4be8] text-white text-xs font-bold transition-all disabled:opacity-30 disabled:hover:bg-[#7c5cfc]"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Separate Modal: Slot Picker Grid */}
      {showSlotPicker && (
        <div className="fixed inset-0 z-[60] bg-[#080a10]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl animate-in fade-in duration-200 animate-out fade-out">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#7c5cfc]" />
                  Select Mentor Availability Slot
                </h2>
                <p className="text-[10px] text-white/35 mt-0.5">
                  Click on any green slot to select it. Already booked slots are marked as unavailable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotPicker(false)}
                className="text-white/40 hover:text-white transition-all bg-white/[0.02] border border-white/[0.06] p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Week controls */}
              <div className="flex items-center justify-between bg-[#13161e] border border-white/[0.06] rounded-xl px-4 py-2.5">
                <button
                  type="button"
                  onClick={goToPrevWeek}
                  className="flex items-center gap-1 text-xs font-bold text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Week
                </button>
                <span className="text-xs font-bold text-white tracking-wide tabular-nums">
                  {currentWeekStart.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  {" — "}
                  {(() => {
                    const end = new Date(currentWeekStart);
                    end.setDate(currentWeekStart.getDate() + 6);
                    return end.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
                  })()}
                </span>
                <button
                  type="button"
                  onClick={goToNextWeek}
                  className="flex items-center gap-1 text-xs font-bold text-white/60 hover:text-white transition-colors"
                >
                  Next Week <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 7 columns grid */}
              <div className="grid grid-cols-7 gap-3 overflow-x-auto min-w-[850px] max-h-[450px] overflow-y-auto pr-1 pb-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(currentWeekStart);
                  date.setDate(currentWeekStart.getDate() + i);
                  const isToday = new Date().toDateString() === date.toDateString();

                  // Get ALL slots for ALL mentors on this weekday (no qualifiedPrograms filtering so that we show mentor slots!)
                  const slotsForDay = [];
                  for (const mentor of mentors) {
                    for (const slot of mentor.mentorSchedules || []) {
                      if (slot.weekday === date.getDay()) {
                        // Only show slots matching the current scheduling class type
                        const slotType = slot.scheduleType === "DEMO" ? "DEMO" : "REGULAR";
                        if (slotType === selectedClassType) {
                          slotsForDay.push({ ...slot, mentor });
                        }
                      }
                    }
                  }
                  slotsForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={i}
                      className={`flex flex-col rounded-2xl border p-3 bg-[#13161e] shrink-0 min-h-[220px] transition-all ${
                        isToday
                          ? "border-[#7c5cfc] shadow-lg shadow-[#7c5cfc]/10 bg-[#7c5cfc]/5"
                          : "border-white/[0.05] hover:border-white/[0.1]"
                      }`}
                    >
                      {/* Day Header - VERY Prominent day & date */}
                      <div className="text-center pb-2.5 border-b border-white/[0.05] mb-2.5 shrink-0">
                        <span
                          className={`text-xs font-extrabold uppercase tracking-wider block ${
                            isToday ? "text-[#7c5cfc]" : "text-white/40"
                          }`}
                        >
                          {date.toLocaleDateString("en-GB", { weekday: "short" })}
                        </span>
                        <span
                          className={`text-lg font-black block mt-0.5 ${
                            isToday ? "text-white" : "text-white/80"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        <span className="text-[9px] font-medium text-white/20 block uppercase tracking-tight">
                          {date.toLocaleDateString("en-GB", { month: "short" })}
                        </span>
                      </div>

                      {/* List */}
                      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 max-h-[300px]">
                        {slotsForDay.length === 0 ? (
                          <span className="text-[9px] text-white/10 block text-center mt-6 italic">
                            No slots
                          </span>
                        ) : (
                          slotsForDay.map((slot) => {
                            const booked = isSlotBooked(slot, date);
                            const selected = isSlotSelected(slot, date);

                            return (
                              <button
                                key={slot.id || `${slot.mentor.id}-${slot.startTime}`}
                                type="button"
                                disabled={booked}
                                onClick={() => {
                                  handleSelectSlot(slot, date);
                                  setShowSlotPicker(false); // Close modal on select!
                                }}
                                className={`w-full text-left p-2 rounded-xl border transition-all flex flex-col gap-1 select-none ${
                                  booked
                                    ? "bg-white/[0.01] border-white/[0.02] opacity-25 cursor-not-allowed text-white/25"
                                    : selected
                                    ? "bg-[#00d4aa]/15 border-[#00d4aa] text-[#00d4aa] ring-1 ring-[#00d4aa]"
                                    : "bg-[#00d4aa]/5 border-[#00d4aa]/25 hover:bg-[#00d4aa]/10 hover:border-[#00d4aa]/40 text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[10px] font-bold tracking-tight tabular-nums">
                                    {slot.startTime}
                                  </span>
                                  {booked ? (
                                    <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded font-semibold uppercase">
                                      Booked
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[8px] px-1 rounded uppercase font-semibold ${
                                        slot.scheduleType === "DEMO"
                                          ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                                          : "bg-[#3b82f6]/15 text-[#60a5fa]"
                                      }`}
                                    >
                                      {slot.scheduleType === "DEMO" ? "Demo" : "Reg"}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9px] font-semibold block truncate text-white/70">
                                    {slot.mentor.firstName} {slot.mentor.lastName[0]}.
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reusable Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Reusable Confirm Dialog Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal: Class Meeting Recording */}
      {showRecordingModal && selectedClassForRecording && (
        <div className="fixed inset-0 z-50 bg-[#080a10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-4 h-4 text-[#00d4aa]" />
                Class Session Recording Manager
              </h2>
              <button
                onClick={() => {
                  setShowRecordingModal(false);
                  setSelectedClassForRecording(null);
                }}
                className="text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Class Info Card */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9px]">Class Type</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                    selectedClassForRecording.classType === "DEMO"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }`}>
                    {selectedClassForRecording.classType || "REGULAR"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9px]">Student</span>
                  <span className="font-semibold text-white/80">
                    {(() => {
                      if (selectedClassForRecording.classType === "DEMO") {
                        const lead = leads.find((l) => l.id === selectedClassForRecording.leadId);
                        return lead ? `${lead.firstName} ${lead.lastName}` : "Unknown Lead";
                      }
                      return selectedClassForRecording.student
                        ? `${selectedClassForRecording.student.firstName} ${selectedClassForRecording.student.lastName}`
                        : "Unknown Student";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9px]">Mentor</span>
                  <span className="font-semibold text-[#60a5fa]">
                    {selectedClassForRecording.mentor?.firstName} {selectedClassForRecording.mentor?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9px]">Schedule Time</span>
                  <span className="font-medium text-white/70">
                    {new Date(selectedClassForRecording.startTime).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}{" "}
                    at{" "}
                    {new Date(selectedClassForRecording.startTime).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                {selectedClassForRecording.meetingLink && (
                  <div className="flex flex-col pt-2 border-t border-white/[0.04]">
                    <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] mb-1">Meeting Link</span>
                    <a
                      href={selectedClassForRecording.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#00d4aa] hover:underline truncate animate-pulse"
                    >
                      {selectedClassForRecording.meetingLink}
                    </a>
                  </div>
                )}
              </div>

              {/* Recordings List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Google Drive Recording Files
                </h3>

                {(() => {
                  const classRecs = recordingsList.filter(
                    (rec) => rec.meeting?.meetUrl === selectedClassForRecording.meetingLink
                  );

                  if (classRecs.length === 0) {
                    return (
                      <div className="bg-[#13161e] border border-white/[0.05] rounded-2xl p-6 text-center space-y-4">
                        <p className="text-xs text-white/35 italic">
                          No recording file is linked to this session's Google Meet room yet.
                        </p>
                        <button
                          type="button"
                          onClick={handleSyncRecording}
                          disabled={syncingRecording || !selectedClassForRecording.meetingLink}
                          className="px-4 py-2 bg-[#00d4aa]/10 hover:bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/20 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-30"
                        >
                          {syncingRecording ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          Scan Google Drive for Recording
                        </button>
                      </div>
                    );
                  }

                  return classRecs.map((rec) => {
                    const isTranscript = rec.fileName.toLowerCase().includes("transcript");
                    return (
                      <div key={rec.id} className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-250">
                        {/* File Details */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white text-xs block truncate max-w-[320px]">
                              {isTranscript ? "📄 " : "🎥 "} {rec.fileName}
                            </span>
                            <span className="text-[10px] text-white/30 font-medium">
                              {isTranscript ? "Google Meet Transcript Document" : `${(rec.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                            rec.downloadStatus === "COMPLETED"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : rec.downloadStatus === "FAILED"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                          }`}>
                            {rec.downloadStatus === "COMPLETED" ? "Ready" : rec.downloadStatus}
                          </span>
                        </div>

                        {/* Download Flow */}
                        {rec.downloadStatus !== "COMPLETED" ? (
                          <div className="bg-[#13161e] p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.03]">
                            <span className="text-[10px] text-white/40 font-medium">
                              {isTranscript
                                ? "Transcript is on Cloud Drive. Download as plain text to view content."
                                : "File is located in Cloud Drive. Download is required to enable streaming."}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadVideo(rec.id)}
                              disabled={syncingRecording}
                              className="px-3.5 py-2 bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 text-[#7c5cfc] border border-[#7c5cfc]/30 rounded-xl text-[10px] font-bold transition-all shrink-0 inline-flex items-center gap-1"
                            >
                              {syncingRecording && <Loader2 className="w-3 h-3 animate-spin" />}
                              Download
                            </button>
                          </div>
                        ) : isTranscript ? (
                          /* Transcript View Flow */
                          <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-white/30 uppercase font-bold tracking-wider">
                                📖 Transcript Content
                              </span>
                              {!transcriptContentMap[rec.id] && (
                                <button
                                  type="button"
                                  onClick={() => loadTranscriptContent(rec.id)}
                                  disabled={loadingTranscriptMap[rec.id]}
                                  className="px-2.5 py-1 bg-[#00d4aa]/10 hover:bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/30 rounded-lg text-[9px] font-bold transition-all inline-flex items-center gap-1"
                                >
                                  {loadingTranscriptMap[rec.id] && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                  Load Content
                                </button>
                              )}
                            </div>
                            {transcriptContentMap[rec.id] ? (
                              <div className="bg-[#13161e] border border-white/[0.05] rounded-xl p-4 text-[10px] text-white/70 max-h-[220px] overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed select-text">
                                {transcriptContentMap[rec.id]}
                              </div>
                            ) : (
                              <div className="bg-[#13161e] border border-dashed border-white/5 rounded-xl p-4 text-center text-[10px] text-white/20 italic">
                                Content not loaded. Click the button above to fetch.
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Regular Video/Audio Flow */
                          <div className="space-y-4 pt-2 border-t border-white/[0.04]">
                            {/* Video Player */}
                            <div>
                              <span className="text-[9px] text-white/30 uppercase font-bold tracking-wider block mb-1">
                                🎥 Video Playback
                              </span>
                              <video
                                src={`/api/google/recordings/${rec.id}/stream`}
                                controls
                                className="w-full rounded-xl border border-white/10 bg-black max-h-[220px]"
                              />
                            </div>

                            {/* Audio Flow */}
                            <div className="bg-[#13161e] p-3 rounded-xl space-y-3 border border-white/[0.03]">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/30 uppercase font-bold tracking-wider">
                                  🎙️ Audio Track
                                </span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                  rec.extractedAudioStatus === "COMPLETED"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : rec.extractedAudioStatus === "FAILED"
                                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                                }`}>
                                  {rec.extractedAudioStatus === "COMPLETED" ? "Extracted" : rec.extractedAudioStatus}
                                </span>
                              </div>

                              {rec.extractedAudioStatus !== "COMPLETED" ? (
                                <div className="flex items-center justify-between gap-3 pt-1">
                                  <span className="text-[10px] text-white/40 font-medium leading-relaxed">
                                    Extract clean audio files to support student review and analytics models.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleExtractAudio(rec.id)}
                                    disabled={syncingRecording}
                                    className="px-3 py-2 bg-[#00d4aa]/10 hover:bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/20 rounded-xl text-[10px] font-bold transition-all shrink-0 inline-flex items-center gap-1"
                                  >
                                    {syncingRecording && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Extract
                                  </button>
                                </div>
                              ) : (
                                <div className="pt-1">
                                  <audio
                                    src={`/api/google/recordings/${rec.id}/stream?type=audio`}
                                    controls
                                    className="w-full bg-[#161b27] rounded-xl border border-white/5 h-9"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-white/[0.06] bg-white/[0.01]">
              <button
                type="button"
                onClick={() => {
                  setShowRecordingModal(false);
                  setSelectedClassForRecording(null);
                }}
                className="px-5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] text-white/80 text-xs font-bold transition-all"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

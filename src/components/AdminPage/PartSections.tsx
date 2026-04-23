"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Save,
  Loader,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useAxios from "@/useAxios";
import storage from "@/lib/storage";

interface PartSectionsProps {
  csrfToken: string;
}

interface Translation {
  language: string;
  title: string;
  description?: string | null;
}

interface PartSummary {
  id: string;
  translations: Translation[];
  images: string[];
}

interface PartSection {
  id: string;
  sortingRank: number;
  active: boolean;
  translations: Translation[];
  parts?: PartSummary[];
  _count?: { parts: number };
  createdAt: string;
}

interface SectionFormData {
  translations: {
    en: { title: string; description: string };
    de: { title: string; description: string };
    fr: { title: string; description: string };
    it: { title: string; description: string };
  };
  sortingRank: number;
  active: boolean;
}

const emptyForm = (): SectionFormData => ({
  translations: {
    en: { title: "", description: "" },
    de: { title: "", description: "" },
    fr: { title: "", description: "" },
    it: { title: "", description: "" },
  },
  sortingRank: 0,
  active: true,
});

const LANGS = ["en", "de", "fr", "it"] as const;

const PartSections: React.FC<PartSectionsProps> = ({ csrfToken }) => {
  const axiosInstance = useAxios();

  const [sections, setSections] = useState<PartSection[]>([]);
  const [allParts, setAllParts] = useState<PartSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  const [selected, setSelected] = useState<PartSection | null>(null);
  const [form, setForm] = useState<SectionFormData>(emptyForm());

  // Manage parts modal state
  const [partsSearch, setPartsSearch] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [assignedPartIds, setAssignedPartIds] = useState<Set<string>>(
    new Set()
  );

  const authHeaders = {
    Authorization: `Bearer ${storage.getItem("access_token")}`,
    "X-CSRF-Token": csrfToken,
  };

  const fetchSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get<PartSection[]>(
        "/part-sections/admin",
        { headers: authHeaders }
      );
      setSections(res.data);
    } catch {
      setError("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllParts = async () => {
    try {
      const res = await axiosInstance.get<{ data: PartSummary[] }>("/parts", {
        params: { status: "all", limit: 1000 },
      });
      setAllParts(res.data.data ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSections();
    fetchAllParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = (translations: Translation[]) =>
    translations.find((t) => t.language === "en")?.title ||
    translations[0]?.title ||
    "(untitled)";

  const openAdd = () => {
    setForm(emptyForm());
    setShowAddModal(true);
  };

  const openEdit = (s: PartSection) => {
    setSelected(s);
    const t = (lang: string) =>
      s.translations.find((tr) => tr.language === lang);
    setForm({
      sortingRank: s.sortingRank,
      active: s.active,
      translations: {
        en: { title: t("en")?.title ?? "", description: t("en")?.description ?? "" },
        de: { title: t("de")?.title ?? "", description: t("de")?.description ?? "" },
        fr: { title: t("fr")?.title ?? "", description: t("fr")?.description ?? "" },
        it: { title: t("it")?.title ?? "", description: t("it")?.description ?? "" },
      },
    });
    setShowEditModal(true);
  };

  const openDelete = (s: PartSection) => {
    setSelected(s);
    setShowDeleteModal(true);
  };

  const openManageParts = async (s: PartSection) => {
    setSelected(s);
    setPartsSearch("");
    // Load full section with parts
    try {
      const res = await axiosInstance.get<PartSection>(
        `/part-sections/${s.id}`,
        { headers: authHeaders }
      );
      const ids = new Set((res.data.parts ?? []).map((p) => p.id));
      setAssignedPartIds(ids);
    } catch {
      setAssignedPartIds(new Set());
    }
    setShowPartsModal(true);
  };

  const handleSave = async (isEdit: boolean) => {
    if (!form.translations.en.title.trim()) {
      setError("English title is required");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const payload = {
        translations: Object.fromEntries(
          LANGS.map((lang) => [
            lang,
            {
              title: form.translations[lang].title,
              description: form.translations[lang].description || undefined,
            },
          ]).filter(([, v]) => (v as { title?: string }).title)
        ),
        sortingRank: form.sortingRank,
        active: form.active,
      };

      if (isEdit && selected) {
        await axiosInstance.put(`/part-sections/${selected.id}`, payload, {
          headers: authHeaders,
        });
        setSuccess("Section updated");
      } else {
        await axiosInstance.post("/part-sections", payload, {
          headers: authHeaders,
        });
        setSuccess("Section created");
      }

      await fetchSections();
      setShowAddModal(false);
      setShowEditModal(false);
    } catch {
      setError("Failed to save section");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await axiosInstance.delete(`/part-sections/${selected.id}`, {
        headers: authHeaders,
      });
      setSuccess("Section deleted");
      await fetchSections();
      setShowDeleteModal(false);
    } catch {
      setError("Failed to delete section");
    } finally {
      setProcessing(false);
    }
  };

  const togglePartAssignment = async (partId: string) => {
    if (!selected) return;
    const isAssigned = assignedPartIds.has(partId);
    try {
      if (isAssigned) {
        await axiosInstance.delete(
          `/part-sections/${selected.id}/parts/${partId}`,
          { headers: authHeaders }
        );
        setAssignedPartIds((prev) => {
          const next = new Set(prev);
          next.delete(partId);
          return next;
        });
      } else {
        await axiosInstance.post(
          `/part-sections/${selected.id}/parts/${partId}`,
          {},
          { headers: authHeaders }
        );
        setAssignedPartIds((prev) => new Set(prev).add(partId));
      }
    } catch {
      setError("Failed to update part assignment");
    }
  };

  const filteredParts = allParts.filter((p) => {
    const title = getTitle(p.translations).toLowerCase();
    return title.includes(partsSearch.toLowerCase());
  });

  const Modal = ({
    title,
    onClose,
    children,
  }: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  const SectionForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded bg-red-900/30 border border-red-700 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {LANGS.map((lang) => (
        <div key={lang}>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            {lang.toUpperCase()} Title {lang === "en" && <span className="text-red-400">*</span>}
          </label>
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            placeholder={`Title in ${lang.toUpperCase()}`}
            value={form.translations[lang].title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                translations: {
                  ...f.translations,
                  [lang]: { ...f.translations[lang], title: e.target.value },
                },
              }))
            }
          />
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            placeholder={`Description in ${lang.toUpperCase()} (optional)`}
            value={form.translations[lang].description}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                translations: {
                  ...f.translations,
                  [lang]: {
                    ...f.translations[lang],
                    description: e.target.value,
                  },
                },
              }))
            }
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Sorting Rank
          </label>
          <input
            type="number"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            value={form.sortingRank}
            onChange={(e) =>
              setForm((f) => ({ ...f, sortingRank: Number(e.target.value) }))
            }
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
              className="h-4 w-4 rounded accent-amber-500"
            />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleSave(isEdit)}
          disabled={processing}
          className="flex items-center gap-2 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {processing ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Update" : "Create"}
        </button>
        <button
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setError(null);
          }}
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {success && (
        <div className="mb-4 rounded border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}
      {error && !showAddModal && !showEditModal && (
        <div className="mb-4 flex items-center gap-2 rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Sections allow you to group parts (e.g. &quot;Plate Holders&quot;, &quot;Hoodies&quot;, &quot;Stickers&quot;).
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded border border-zinc-700 bg-zinc-900 py-12 text-center text-zinc-500">
          <Package className="mx-auto mb-3 h-8 w-8" />
          No sections yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded border border-zinc-700 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {getTitle(section.translations)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        section.active
                          ? "bg-green-900/50 text-green-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {section.active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      rank {section.sortingRank}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-zinc-500">
                    {section.translations.map((t) => (
                      <span key={t.language} className="rounded bg-zinc-800 px-1.5 py-0.5">
                        {t.language}: {t.title}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {section._count?.parts ?? 0} parts assigned
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openManageParts(section)}
                    className="flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-400"
                  >
                    <Package className="h-3 w-3" /> Manage Parts
                  </button>
                  <button
                    onClick={() => openEdit(section)}
                    className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:text-amber-400"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openDelete(section)}
                    className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === section.id ? null : section.id
                      )
                    }
                    className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:text-white"
                  >
                    {expandedSection === section.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <Modal title="Add Section" onClose={() => { setShowAddModal(false); setError(null); }}>
          <SectionForm isEdit={false} />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal title="Edit Section" onClose={() => { setShowEditModal(false); setError(null); }}>
          <SectionForm isEdit={true} />
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selected && (
        <Modal title="Delete Section" onClose={() => setShowDeleteModal(false)}>
          <p className="mb-4 text-zinc-300">
            Are you sure you want to delete &quot;
            <strong>{getTitle(selected.translations)}</strong>&quot;? Parts will not be
            deleted, only the section assignment will be removed.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={processing}
              className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {processing ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Manage Parts Modal */}
      {showPartsModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                Manage Parts — {getTitle(selected.translations)}
              </h3>
              <button
                onClick={() => {
                  setShowPartsModal(false);
                  fetchSections();
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-zinc-700 px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  className="w-full rounded border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  placeholder="Search parts..."
                  value={partsSearch}
                  onChange={(e) => setPartsSearch(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {assignedPartIds.size} of {allParts.length} parts assigned
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredParts.map((part) => {
                  const isAssigned = assignedPartIds.has(part.id);
                  return (
                    <label
                      key={part.id}
                      className={`flex cursor-pointer items-center gap-3 rounded border p-3 transition-colors ${
                        isAssigned
                          ? "border-amber-500/50 bg-amber-500/5"
                          : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => togglePartAssignment(part.id)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="text-sm text-zinc-200">
                        {getTitle(part.translations)}
                      </span>
                      {isAssigned && (
                        <span className="ml-auto text-xs text-amber-400">
                          assigned
                        </span>
                      )}
                    </label>
                  );
                })}
                {filteredParts.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No parts found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartSections;

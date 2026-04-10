"use client";

import { useState, useEffect, useCallback } from "react";
import useAxios from "@/useAxios";
import { BlogPost, CreateBlogPostDto } from "@/types/blog.types";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import Image from "next/image";

interface BlogManagementProps {
  csrfToken: string | null;
}

const BlogManagement = ({ csrfToken }: BlogManagementProps) => {
  const axiosInstance = useAxios();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<
    "de" | "en" | "fr" | "it"
  >("en");

  const [formData, setFormData] = useState({
    author: "",
    writingDate: new Date().toISOString().split("T")[0],
    active: false,
    images: [] as { url: string; altText?: string }[],
    links: [] as {
      translations: { language: string; url: string; title: string }[];
    }[],
  });

  // Separate state for each language translation
  const [translations, setTranslations] = useState<
    Record<
      "de" | "en" | "fr" | "it",
      { title: string; markdownContent: string }
    >
  >({
    de: { title: "", markdownContent: "" },
    en: { title: "", markdownContent: "" },
    fr: { title: "", markdownContent: "" },
    it: { title: "", markdownContent: "" },
  });

  const [imageInput, setImageInput] = useState({ url: "", altText: "" });
  const [linkTranslations, setLinkTranslations] = useState<
    Record<"de" | "en" | "fr" | "it", { url: string; title: string }>
  >({
    de: { url: "", title: "" },
    en: { url: "", title: "" },
    fr: { url: "", title: "" },
    it: { url: "", title: "" },
  });
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  const fetchBlogPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/blog");
      setBlogPosts(response.data as BlogPost[]);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      const uploadedUrls: string[] = [];

      // Upload each file individually
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("image", file);

        const response = await axiosInstance.post(
          "/blog/upload-image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              "X-CSRF-Token": csrfToken || "",
            },
          }
        );

        const imageUrl = (response.data as { imageUrl: string }).imageUrl;
        uploadedUrls.push(imageUrl);
      }

      setUploadedImageUrls((prev) => [...prev, ...uploadedUrls]);
      alert(
        `${uploadedUrls.length} image(s) uploaded successfully! URLs are displayed below for use in markdown.`
      );
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const addImage = () => {
    if (imageInput.url) {
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), imageInput],
      }));
      setImageInput({ url: "", altText: "" });
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const addLink = () => {
    // Build translations array from all languages that have content
    const linkTranslationsArray: {
      language: string;
      url: string;
      title: string;
    }[] = [];

    Object.entries(linkTranslations).forEach(([lang, content]) => {
      if (content.url.trim() && content.title.trim()) {
        linkTranslationsArray.push({
          language: lang as "de" | "en" | "fr" | "it",
          url: content.url,
          title: content.title,
        });
      }
    });

    if (linkTranslationsArray.length === 0) {
      alert("Please add at least one link translation with URL and title");
      return;
    }

    if (editingLinkIndex !== null) {
      // Update existing link
      setFormData((prev) => ({
        ...prev,
        links: prev.links.map((link, idx) =>
          idx === editingLinkIndex
            ? { translations: linkTranslationsArray }
            : link
        ),
      }));
      setEditingLinkIndex(null);
    } else {
      // Add new link
      setFormData((prev) => ({
        ...prev,
        links: [...(prev.links || []), { translations: linkTranslationsArray }],
      }));
    }

    // Reset link translations
    setLinkTranslations({
      de: { url: "", title: "" },
      en: { url: "", title: "" },
      fr: { url: "", title: "" },
      it: { url: "", title: "" },
    });
  };

  const removeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build translations array from all languages that have content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const translationsArray: any[] = [];
      Object.entries(translations).forEach(([lang, content]) => {
        if (content.title.trim() && content.markdownContent.trim()) {
          translationsArray.push({
            language: lang as "de" | "en" | "fr" | "it",
            title: content.title,
            markdownContent: content.markdownContent,
            // Temporary: Also send as htmlContent for backend compatibility
            htmlContent: content.markdownContent,
          });
        }
      });

      if (translationsArray.length === 0) {
        alert("Please add at least one translation with title and content");
        return;
      }

      // Transform form data to match the backend DTO structure
      const blogDto: CreateBlogPostDto = {
        author: formData.author,
        writingDate: formData.writingDate,
        active: formData.active,
        translations: translationsArray,
        ...(formData.images &&
          formData.images.length > 0 && { images: formData.images }),
        ...(formData.links &&
          formData.links.length > 0 && { links: formData.links }),
      };

      console.log("Sending blog DTO:", JSON.stringify(blogDto, null, 2));

      if (editingPost) {
        await axiosInstance.patch(`/blog/${editingPost.id}`, blogDto, {
          headers: { "X-CSRF-Token": csrfToken || "" },
        });
      } else {
        await axiosInstance.post("/blog", blogDto, {
          headers: { "X-CSRF-Token": csrfToken || "" },
        });
      }

      fetchBlogPosts();
      resetForm();
    } catch (error: unknown) {
      console.error("Error saving blog post:", error);

      const axiosError = error as {
        response?: { data?: { message?: string | string[] }; status?: number };
      };
      console.error("Error response:", axiosError.response?.data);
      console.error("Error status:", axiosError.response?.status);

      const errorMessage =
        axiosError.response?.data?.message || "Failed to save blog post";
      alert(
        `Failed to save blog post:\n${
          Array.isArray(errorMessage) ? errorMessage.join("\n") : errorMessage
        }`
      );
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);

    // Load all translations
    const newTranslations: Record<
      "de" | "en" | "fr" | "it",
      { title: string; markdownContent: string }
    > = {
      de: { title: "", markdownContent: "" },
      en: { title: "", markdownContent: "" },
      fr: { title: "", markdownContent: "" },
      it: { title: "", markdownContent: "" },
    };

    post.translations?.forEach((trans) => {
      newTranslations[trans.language] = {
        title: trans.title,
        markdownContent: trans.markdownContent,
      };
    });

    // Fallback to legacy fields if no translations exist
    if (post.translations?.length === 0 && post.title && post.markdownContent) {
      newTranslations.de = {
        title: post.title,
        markdownContent: post.markdownContent,
      };
    }

    setTranslations(newTranslations);

    setFormData({
      author: post.author,
      writingDate: post.writingDate.split("T")[0],
      active: post.active,
      images: post.images.map((img) => ({
        url: img.url,
        altText: img.altText,
      })),
      links: post.links.map((link) => ({
        translations: link.translations.map((trans) => ({
          language: trans.language,
          url: trans.url,
          title: trans.title,
        })),
      })),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      await axiosInstance.delete(`/blog/${id}`, {
        headers: { "X-CSRF-Token": csrfToken || "" },
      });
      fetchBlogPosts();
    } catch (error) {
      console.error("Error deleting blog post:", error);
      alert("Failed to delete blog post");
    }
  };

  const toggleActive = async (post: BlogPost) => {
    try {
      const endpoint = post.active ? "deactivate" : "activate";
      await axiosInstance.patch(
        `/blog/${post.id}/${endpoint}`,
        {},
        {
          headers: { "X-CSRF-Token": csrfToken || "" },
        }
      );
      fetchBlogPosts();
    } catch (error) {
      console.error("Error toggling blog post status:", error);
      alert("Failed to update blog post status");
    }
  };

  const resetForm = () => {
    setFormData({
      author: "",
      writingDate: new Date().toISOString().split("T")[0],
      active: false,
      images: [],
      links: [],
    });
    setTranslations({
      de: { title: "", markdownContent: "" },
      en: { title: "", markdownContent: "" },
      fr: { title: "", markdownContent: "" },
      it: { title: "", markdownContent: "" },
    });
    setActiveLanguageTab("en");
    setEditingPost(null);
    setShowForm(false);
    setImageInput({ url: "", altText: "" });
    setLinkTranslations({
      de: { url: "", title: "" },
      en: { url: "", title: "" },
      fr: { url: "", title: "" },
      it: { url: "", title: "" },
    });
    setEditingLinkIndex(null);
    setUploadedImageUrls([]);
  };

  if (loading) {
    return <div className="text-center py-8">Loading blog posts...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Blog Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? "Cancel" : "New Post"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 p-6 rounded-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4">
            {editingPost ? "Edit Blog Post" : "Create New Blog Post"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Author *</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Writing Date *
              </label>
              <input
                type="date"
                value={formData.writingDate}
                onChange={(e) =>
                  setFormData({ ...formData, writingDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium">Publish immediately</span>
              </label>
            </div>
          </div>

          {/* Language Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-gray-600" />
              <h4 className="font-semibold text-lg">Translations</h4>
            </div>

            <div className="flex gap-2 mb-4 border-b">
              {(["de", "en", "fr", "it"] as const).map((lang) => {
                const langNames = {
                  de: "Deutsch",
                  en: "English",
                  fr: "Français",
                  it: "Italiano",
                };
                const hasContent =
                  translations[lang].title ||
                  translations[lang].markdownContent;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLanguageTab(lang)}
                    className={`px-4 py-2 font-medium transition relative ${
                      activeLanguageTab === lang
                        ? "text-purple-600 border-b-2 border-purple-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {langNames[lang]}
                    {hasContent && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Translation Form for Active Language */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Title ({activeLanguageTab.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={translations[activeLanguageTab].title}
                  onChange={(e) =>
                    setTranslations({
                      ...translations,
                      [activeLanguageTab]: {
                        ...translations[activeLanguageTab],
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={`Enter title in ${activeLanguageTab.toUpperCase()}`}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Content - Markdown ({activeLanguageTab.toUpperCase()})
                </label>
                <textarea
                  value={translations[activeLanguageTab].markdownContent}
                  onChange={(e) =>
                    setTranslations({
                      ...translations,
                      [activeLanguageTab]: {
                        ...translations[activeLanguageTab],
                        markdownContent: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={12}
                  placeholder={`# Heading 1\n\nThis is **bold** and this is *italic*.\n\n![Image Alt Text](https://url.com/image.jpg)\n\n- List item 1\n- List item 2\n\n[Link text](https://example.com)`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use Markdown syntax for formatting. Supports headings, bold,
                  italic, images, links, lists, etc.
                </p>
              </div>
            </div>
          </div>

          {/* Image Management */}
          <div className="mb-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Images
            </h4>

            <div className="mb-3">
              <label className="block text-sm mb-2">Upload Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages}
                className="w-full"
              />
              {uploadingImages && (
                <p className="text-sm text-gray-600 mt-1">Uploading...</p>
              )}
            </div>

            {uploadedImageUrls.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-sm font-semibold mb-2 text-blue-900">
                  Uploaded Image URLs (for Markdown):
                </h5>
                <div className="space-y-2">
                  {uploadedImageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="bg-white p-2 rounded border border-blue-100"
                    >
                      <code className="text-xs text-blue-800 block break-all">
                        ![Image description]({url})
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `![Image description](${url})`
                          );
                          alert("Markdown copied to clipboard!");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        Copy Markdown
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm mb-2">Or Add Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Image URL"
                  value={imageInput.url}
                  onChange={(e) =>
                    setImageInput({ ...imageInput, url: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Alt text (optional)"
                  value={imageInput.altText}
                  onChange={(e) =>
                    setImageInput({ ...imageInput, altText: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {formData.images && formData.images.length > 0 && (
              <div className="space-y-2">
                {formData.images.map((img, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white p-2 rounded"
                  >
                    <div className="w-16 h-16 relative flex-shrink-0">
                      <Image
                        src={img.url}
                        alt={img.altText || "Blog image"}
                        fill
                        className="object-cover rounded"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1 text-sm truncate">
                      <div className="font-medium truncate">{img.url}</div>
                      <div className="text-gray-600">
                        {img.altText || "No alt text"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Management */}
          <div className="mb-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Related Links
            </h4>

            <div className="mb-3 bg-white p-4 rounded-lg border">
              <h5 className="text-sm font-semibold mb-3">
                {editingLinkIndex !== null ? "Edit Link" : "Add New Link"}
              </h5>

              {/* Language tabs for links */}
              <div className="flex gap-2 mb-4 border-b">
                {(["de", "en", "fr", "it"] as const).map((lang) => {
                  const langNames = {
                    de: "Deutsch",
                    en: "English",
                    fr: "Français",
                    it: "Italiano",
                  };
                  const hasContent =
                    linkTranslations[lang].url || linkTranslations[lang].title;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLanguageTab(lang)}
                      className={`px-3 py-1 text-sm font-medium transition relative ${
                        activeLanguageTab === lang
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {langNames[lang]}
                      {hasContent && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Link inputs for active language */}
              <div className="space-y-2 mb-3">
                <input
                  type="url"
                  placeholder={`URL (${activeLanguageTab.toUpperCase()})`}
                  value={linkTranslations[activeLanguageTab].url}
                  onChange={(e) =>
                    setLinkTranslations({
                      ...linkTranslations,
                      [activeLanguageTab]: {
                        ...linkTranslations[activeLanguageTab],
                        url: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder={`Title (${activeLanguageTab.toUpperCase()})`}
                  value={linkTranslations[activeLanguageTab].title}
                  onChange={(e) =>
                    setLinkTranslations({
                      ...linkTranslations,
                      [activeLanguageTab]: {
                        ...linkTranslations[activeLanguageTab],
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addLink}
                  className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {editingLinkIndex !== null ? "Update Link" : "Add Link"}
                </button>
                {editingLinkIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLinkIndex(null);
                      setLinkTranslations({
                        de: { url: "", title: "" },
                        en: { url: "", title: "" },
                        fr: { url: "", title: "" },
                        it: { url: "", title: "" },
                      });
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {formData.links && formData.links.length > 0 && (
              <div className="space-y-2">
                {formData.links.map((link, index) => {
                  // Find English translation as default, or first available
                  const defaultTranslation =
                    link.translations.find((t) => t.language === "en") ||
                    link.translations[0];
                  return (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {defaultTranslation?.title || "Untitled"}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {defaultTranslation?.url || ""}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Load link translations for editing
                              const newLinkTranslations: Record<
                                "de" | "en" | "fr" | "it",
                                { url: string; title: string }
                              > = {
                                de: { url: "", title: "" },
                                en: { url: "", title: "" },
                                fr: { url: "", title: "" },
                                it: { url: "", title: "" },
                              };
                              link.translations.forEach((trans) => {
                                newLinkTranslations[
                                  trans.language as "de" | "en" | "fr" | "it"
                                ] = {
                                  url: trans.url,
                                  title: trans.title,
                                };
                              });
                              setLinkTranslations(newLinkTranslations);
                              setEditingLinkIndex(index);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {link.translations.map((trans) => (
                          <span
                            key={trans.language}
                            className="text-xs px-2 py-0.5 bg-gray-100 rounded"
                          >
                            {trans.language.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Save className="h-5 w-5" />
              {editingPost ? "Update Post" : "Create Post"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Blog Posts List */}
      <div className="space-y-4">
        {blogPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No blog posts yet. Create your first one!
          </div>
        ) : (
          blogPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white border rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-600">
                    By {post.author} •{" "}
                    {new Date(post.writingDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      post.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {post.active ? "Active" : "Draft"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                {post.images.length > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    {post.images.length} image{post.images.length !== 1 && "s"}
                  </span>
                )}
                {post.links.length > 0 && (
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    {post.links.length} link{post.links.length !== 1 && "s"}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(post)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(post)}
                  className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                    post.active
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {post.active ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BlogManagement;

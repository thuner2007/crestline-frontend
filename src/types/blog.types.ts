export interface BlogImage {
  id: string;
  url: string;
  altText?: string;
  blogPostId: string;
  createdAt: string;
}

export interface BlogLink {
  id: string;
  blogPostId: string;
  createdAt: string;
  translations: BlogLinkTranslation[];
}

export interface BlogLinkTranslation {
  id: string;
  blogLinkId: string;
  language: "de" | "en" | "fr" | "it";
  url: string;
  title: string;
}

export interface BlogPostTranslation {
  id: string;
  blogPostId: string;
  language: "de" | "en" | "fr" | "it";
  title: string;
  markdownContent: string;
}

export interface BlogPost {
  id: string;
  author: string;
  writingDate: string;
  active: boolean;
  readCount?: number;
  createdAt: string;
  updatedAt: string;
  translations: BlogPostTranslation[];
  images: BlogImage[];
  links: BlogLink[];
  // Legacy fields for backward compatibility (deprecated)
  title?: string;
  htmlContent?: string;
  markdownContent?: string;
}

export interface CreateBlogPostTranslationDto {
  language: "de" | "en" | "fr" | "it";
  title: string;
  markdownContent: string;
}

export interface CreateBlogPostDto {
  author: string;
  writingDate: string;
  active: boolean;
  translations: CreateBlogPostTranslationDto[];
  images?: { url: string; altText?: string }[];
  links?: {
    translations: { language: string; url: string; title: string }[];
  }[];
}

export interface UpdateBlogPostDto {
  author?: string;
  writingDate?: string;
  active?: boolean;
  translations?: CreateBlogPostTranslationDto[];
  images?: { url: string; altText?: string }[];
  links?: {
    translations: { language: string; url: string; title: string }[];
  }[];
}

"use client";
import { useTranslations } from "next-intl";

const pdfUrl = "/Datenschutzerklärung_Crestline.pdf";

export default function PrivacyPage() {
  const t = useTranslations("legals");
  
  return (
    <div className="w-full min-h-screen p-4">
      <div className="w-full md:w-3/4 mx-auto h-[70vh] md:h-[80vh]">
        <iframe 
          src={`${pdfUrl}#view=FitH`}
          className="w-full h-full border-0" 
          title="PDF Viewer"
        />
      </div>

      <div className="h-20 flex items-center justify-center mt-4">
        <a
          href={pdfUrl}
          download="Datenschutzerklärung_Crestline.pdf"
          className="btn btn-primary px-6 py-2"
        >
          {t("download")}
        </a>
      </div>
    </div>
  );
}
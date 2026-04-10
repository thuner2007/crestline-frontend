import { FC } from "react";
import { SchemaType } from "@/types/schema";

interface JsonLdProps {
  data: SchemaType;
}

export const JsonLd: FC<JsonLdProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0),
      }}
    />
  );
};

import { SubgroupTranslation } from "./subgroupTranslation.type";

export type Subgroup = {
  id: string;
  createdAt: string;
  translations: SubgroupTranslation[];
};

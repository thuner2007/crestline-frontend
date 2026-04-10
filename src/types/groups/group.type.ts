import { GroupTranslation } from "./groupTranslation.type";
import { Subgroup } from "./subgroup.type";

export type Group = {
  id: string;
  createdAt: string;
  translations: GroupTranslation[];
  subgroups: Subgroup[];
};

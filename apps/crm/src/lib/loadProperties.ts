import { api } from "./api";
import { propertiesStore } from "./propertiesStore";

export const loadProperties = async () => {
  const data = await api.get("/api/properties");
  propertiesStore.set(data);
};

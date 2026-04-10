


let properties: any[] = [];
let idCounter = 1;

export function addProperties(newProps: any[]) {
  const withIds = newProps.map((p) => ({
    ...p,
    id: idCounter++, // always overwrite input id
  }));
  properties = [...properties, ...withIds];
}

export function deleteProperty(id: number) {
  properties = properties.filter((p) => p.id !== id);
}

export function updateProperty(id: number, data: any) {
  properties = properties.map((p) =>
    p.id === id ? { ...p, ...data } : p
  );
}

export function getProperties() {
  return properties;
}

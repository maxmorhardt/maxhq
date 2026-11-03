const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ids from the url go into api paths, so anything else is turned away before it is sent
export const isUuid = (value: string) => UUID.test(value);

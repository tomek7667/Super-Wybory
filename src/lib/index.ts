import PocketBase from "pocketbase";
import { writable } from "svelte/store";
import { user } from "./auth";
export * from "./auth";

export const pb = new PocketBase("https://pocketbase.cyber-man.pl");
export interface Criteria {
  name: string;
  importance: number;
}

interface FilledCriteria extends Criteria {
  value?: number;
}

export interface Item {
  name: string;
  criterias: FilledCriteria[];
}

interface DecisionMatrix {
  name: string;
  criterias: Criteria[];
  items: Item[];
}

export interface MatrixRow {
  id: string;
  data: DecisionMatrix;
  updated: Date;
  created: Date;
  isEncrypted: boolean;
}

export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const emptyMatrix: DecisionMatrix = {
  name: "An example decision",
  criterias: [],
  items: [],
};

export const decisionMatrix = writable<DecisionMatrix>(clone(emptyMatrix));

export const errorMessage = writable<string>("");

export const decisionMatrixId = writable<string | null>(null);

export const shouldEncrypt = writable<boolean>(true);

let _matrixKey: string | null = null;
export const symmetricKey = writable<string | null>(null);

export const clearMatrix = () => {
  decisionMatrix.set(clone(emptyMatrix));
  decisionMatrixId.set(null);
};

const subscribe = () => {
  decisionMatrix.subscribe((matrix) => {
    window.localStorage.setItem("decisionMatrix", JSON.stringify(matrix));
  });

  user.subscribe((user) => {
    window.localStorage.setItem("user", JSON.stringify(user));
  });

  decisionMatrixId.subscribe((id) => {
    if (id) {
      window.localStorage.setItem("decisionMatrixId", id);
    } else {
      window.localStorage.removeItem("decisionMatrixId");
    }
  });

  shouldEncrypt.subscribe((should) => {
    if (should) {
      window.localStorage.setItem("shouldEncrypt", "true");
    } else {
      window.localStorage.removeItem("shouldEncrypt");
    }
  });

  symmetricKey.subscribe((key) => {
    _matrixKey = key;
    if (key) {
      window.localStorage.setItem("symmetricKey", key);
    } else {
      window.localStorage.removeItem("symmetricKey");
    }
  });
};

export const onMountHandler = (callback?: () => void) => {
  const _decisionMatrix = window.localStorage.getItem("decisionMatrix");
  if (_decisionMatrix) {
    decisionMatrix.set(JSON.parse(_decisionMatrix));
  } else {
    clearMatrix();
  }

  const _user = window.localStorage.getItem("user");
  if (_user) {
    user.set(JSON.parse(_user));
  } else {
    user.set(null);
  }

  const _decisionMatrixId = window.localStorage.getItem("decisionMatrixId");
  decisionMatrixId.set(_decisionMatrixId ?? null);

  const _shouldEncrypt = window.localStorage.getItem("shouldEncrypt");
  shouldEncrypt.set(_shouldEncrypt === "true");

  const _symmetricKey = window.localStorage.getItem("symmetricKey");
  symmetricKey.set(_symmetricKey ?? null);
  _matrixKey = _symmetricKey ?? null;

  subscribe();
  if (callback) {
    callback();
  }
};

export const hexlify = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const createKey = async (base: string): Promise<string> => {
  const hashRounds = 0xffff;
  let key = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(base)
  );
  base = hexlify(new Uint8Array(key));
  for (let i = 0; i < hashRounds; i++) {
    key = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
    base = hexlify(new Uint8Array(key));
  }

  return hexlify(new Uint8Array(key.slice(0, 16)));
};

/**
 * Encrypts data with key
 *
 * @param data string to encrypt
 * @param key hex encoded string of length 32
 * @returns encrypted data in base64
 */
export const encryptWithKey = async (data: string, key: string) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    "AES-CTR",
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-CTR",
      counter: iv,
      length: 64,
    },
    cryptoKey,
    new TextEncoder().encode(data)
  );
  return `${hexlify(iv)}:${btoa(
    String.fromCharCode(...new Uint8Array(encrypted))
  )}`;
};

/**
 * Decrypts data with key
 *
 * @param data base64 string to decrypt
 * @param key hex encoded string of length 32
 * @returns decrypted data
 */
export const decryptWithKey = async (data: string, key: string) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    "AES-CTR",
    false,
    ["decrypt"]
  );
  const [iv, encrypted] = data.split(":");
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-CTR",
      counter: new Uint8Array(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        iv.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      ),
      length: 64,
    },
    cryptoKey,
    Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
  );
  return new TextDecoder().decode(decrypted);
};

/**
 * Encrypts matrix with the key available in the store
 *
 * @param encryptedMatrix - string of encrypted matrix
 * @returns decrypted matrix object
 */
export const decryptMatrix = async (
  encryptedMatrix: string
): Promise<DecisionMatrix> => {
  if (!_matrixKey) {
    throw new Error("No key provided. Please logout and log in again.");
  }
  const decrypted = await decryptWithKey(encryptedMatrix, _matrixKey);
  return JSON.parse(decrypted);
};

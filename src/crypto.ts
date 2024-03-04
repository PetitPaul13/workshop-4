import { webcrypto } from "crypto";

// Fonction pour convertir un tampon ArrayBuffer en Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString("base64");
}

// Fonction pour convertir une chaîne Base64 en un tampon ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    var buff = Buffer.from(base64, "base64");
    return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// On définit un type pour réprésenter une paire de clés RSA privée/publique
type GenerateRsaKeyPair = {
    publicKey: webcrypto.CryptoKey;
    privateKey: webcrypto.CryptoKey;
};

// Ici on définit la fonction pour générer une paire de clés RSA privée/publique
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
    const keyPair = await webcrypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    return keyPair;
}

// Fonction pour exporter une clé publique crypto en Base64
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
    const exportedKey = await webcrypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(exportedKey);
}

// Fonction pour exporter une clé privée crypto en Base64
export async function exportPrvKey(
    key: webcrypto.CryptoKey | null
): Promise<string | null> {
    if (key === null) {
        return null;
    }
    const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exportedKey);
}

// Fonction pour importer une clé publique en Base64 vers son format natif
export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(strKey);
    const key = await webcrypto.subtle.importKey(
        "spki",
        keyBuffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
    return key;
}

// Fonction pour importer une clé privée en Base64 vers son format natif
export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(strKey);
    const key = await webcrypto.subtle.importKey(
        "pkcs8",
        keyBuffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
    return key;
}

// Fonction pour enrypt un message en utilisant une clé publique RSA
export async function rsaEncrypt(
    b64Data: string,
    strPublicKey: string
): Promise<string> {
    const publicKey = await importPubKey(strPublicKey);
    const data = new TextEncoder().encode(b64Data);
    const encryptedData = await webcrypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        data
    );
    return arrayBufferToBase64(encryptedData);
}

// Fonction pour decrypt un message en utilisant une clé privée RSA
export async function rsaDecrypt(
    data: string,
    privateKey: webcrypto.CryptoKey
): Promise<string> {
    const dataBuffer = base64ToArrayBuffer(data);
    const decryptedData = await webcrypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        dataBuffer
    );
    return new TextDecoder().decode(decryptedData);
}

// Focntion pour génèrer une clé symétrique aléatoire
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
    const key = await webcrypto.subtle.generateKey(
        {
            name: "AES-CBC",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}

// Fonction pour exporter une clé symétrique crypto en Base64
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
    const exportedKey = await webcrypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exportedKey);
}

// Fonction pour importer une chaîne en Base64 vers son format natif crypto
export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(strKey);
    const key = await webcrypto.subtle.importKey(
        "raw",
        keyBuffer,
        {
            name: "AES-CBC",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}

// Focntion pour encrypte un message en utilisant une clé symétrique
export async function symEncrypt(
    key: webcrypto.CryptoKey,
    data: string
): Promise<string> {
    const iv = webcrypto.getRandomValues(new Uint8Array(16));
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await webcrypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: iv,
        },
        key,
        encodedData
    );
    // Ici on concatène l'IV et les données cryptées
    const resultBuffer = new Uint8Array(iv.byteLength + encryptedData.byteLength);
    resultBuffer.set(new Uint8Array(iv), 0);
    resultBuffer.set(new Uint8Array(encryptedData), iv.byteLength);
    return arrayBufferToBase64(resultBuffer.buffer);
}

// Focntion pour decrypt un message en utilisant une clé symétrique
export async function symDecrypt(
    strKey: string,
    encryptedData: string
): Promise<string> {
    const key = await importSymKey(strKey);
    const dataBuffer = base64ToArrayBuffer(encryptedData);
    const iv = dataBuffer.slice(0, 16);
    const data = dataBuffer.slice(16);
    const decryptedData = await webcrypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv,
        },
        key,
        data
    );
    return new TextDecoder().decode(decryptedData);
}
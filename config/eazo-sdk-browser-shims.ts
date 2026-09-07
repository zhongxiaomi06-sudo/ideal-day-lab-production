import type { Plugin } from 'vite';

const cryptoId = '\0eazo-sdk-browser-crypto';
const bufferId = '\0eazo-sdk-browser-buffer';

export function eazoSdkBrowserShims(): Plugin {
  return {
    name: 'eazo-sdk-browser-shims',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'crypto' || id === 'node:crypto') return cryptoId;
      if (id === 'buffer' || id === 'node:buffer') return bufferId;
      return null;
    },
    load(id) {
      if (id === cryptoId) return `const unavailable=(name)=>(..._args)=>{throw new Error('The @eazo/sdk '+name+' path is server-only and unavailable in this browser miniapp.')};export const createHash=unavailable('createHash'),createDecipheriv=unavailable('createDecipheriv'),createCipheriv=unavailable('createCipheriv'),createHmac=unavailable('createHmac'),randomBytes=unavailable('randomBytes');export const randomUUID=()=>globalThis.crypto?.randomUUID?.()??String(Date.now());export default{createHash,createDecipheriv,createCipheriv,createHmac,randomBytes,randomUUID};`;
      if (id === bufferId) return `const encoder=new TextEncoder();export const Buffer={from(value,encoding){if(typeof value!=='string')return value instanceof Uint8Array?value:new Uint8Array(value);if(encoding==='hex')return Uint8Array.from(value.match(/.{1,2}/g)?.map(byte=>parseInt(byte,16))??[]);if(encoding==='base64')return Uint8Array.from(atob(value),char=>char.charCodeAt(0));return encoder.encode(value)},concat(chunks){const out=new Uint8Array(chunks.reduce((sum,chunk)=>sum+chunk.length,0));let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length}return out},isBuffer(value){return value instanceof Uint8Array},alloc(size){return new Uint8Array(size)}};export default{Buffer};`;
      return null;
    },
  };
}

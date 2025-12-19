/// <reference types="node" />
/// <reference types="node" />
import { URLSearchParams } from 'url';
import FormData from '../../form-data/FormData.cjs';
import Blob from '../../file/Blob.cjs';
type IRequestBody = ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | string | URLSearchParams | Blob | FormData | null;
export default IRequestBody;
//# sourceMappingURL=IRequestBody.d.ts.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CustomElementRegistry_js_1 = __importDefault(require("../custom-element/CustomElementRegistry.cjs"));
const Document_js_1 = __importDefault(require("../nodes/document/Document.cjs"));
const HTMLDocument_js_1 = __importDefault(require("../nodes/html-document/HTMLDocument.cjs"));
const XMLDocument_js_1 = __importDefault(require("../nodes/xml-document/XMLDocument.cjs"));
const SVGDocument_js_1 = __importDefault(require("../nodes/svg-document/SVGDocument.cjs"));
const Node_js_1 = __importDefault(require("../nodes/node/Node.cjs"));
const NodeFilter_js_1 = __importDefault(require("../tree-walker/NodeFilter.cjs"));
const Text_js_1 = __importDefault(require("../nodes/text/Text.cjs"));
const Comment_js_1 = __importDefault(require("../nodes/comment/Comment.cjs"));
const ShadowRoot_js_1 = __importDefault(require("../nodes/shadow-root/ShadowRoot.cjs"));
const Element_js_1 = __importDefault(require("../nodes/element/Element.cjs"));
const HTMLTemplateElement_js_1 = __importDefault(require("../nodes/html-template-element/HTMLTemplateElement.cjs"));
const HTMLFormElement_js_1 = __importDefault(require("../nodes/html-form-element/HTMLFormElement.cjs"));
const HTMLElement_js_1 = __importDefault(require("../nodes/html-element/HTMLElement.cjs"));
const HTMLUnknownElement_js_1 = __importDefault(require("../nodes/html-unknown-element/HTMLUnknownElement.cjs"));
const HTMLInputElement_js_1 = __importDefault(require("../nodes/html-input-element/HTMLInputElement.cjs"));
const HTMLSelectElement_js_1 = __importDefault(require("../nodes/html-select-element/HTMLSelectElement.cjs"));
const HTMLTextAreaElement_js_1 = __importDefault(require("../nodes/html-text-area-element/HTMLTextAreaElement.cjs"));
const HTMLLinkElement_js_1 = __importDefault(require("../nodes/html-link-element/HTMLLinkElement.cjs"));
const HTMLStyleElement_js_1 = __importDefault(require("../nodes/html-style-element/HTMLStyleElement.cjs"));
const HTMLSlotElement_js_1 = __importDefault(require("../nodes/html-slot-element/HTMLSlotElement.cjs"));
const HTMLLabelElement_js_1 = __importDefault(require("../nodes/html-label-element/HTMLLabelElement.cjs"));
const HTMLMetaElement_js_1 = __importDefault(require("../nodes/html-meta-element/HTMLMetaElement.cjs"));
const HTMLMediaElement_js_1 = __importDefault(require("../nodes/html-media-element/HTMLMediaElement.cjs"));
const HTMLAudioElement_js_1 = __importDefault(require("../nodes/html-audio-element/HTMLAudioElement.cjs"));
const Audio_js_1 = __importDefault(require("../nodes/html-audio-element/Audio.cjs"));
const HTMLVideoElement_js_1 = __importDefault(require("../nodes/html-video-element/HTMLVideoElement.cjs"));
const HTMLBaseElement_js_1 = __importDefault(require("../nodes/html-base-element/HTMLBaseElement.cjs"));
const HTMLIFrameElement_js_1 = __importDefault(require("../nodes/html-iframe-element/HTMLIFrameElement.cjs"));
const HTMLDialogElement_js_1 = __importDefault(require("../nodes/html-dialog-element/HTMLDialogElement.cjs"));
const SVGSVGElement_js_1 = __importDefault(require("../nodes/svg-element/SVGSVGElement.cjs"));
const SVGElement_js_1 = __importDefault(require("../nodes/svg-element/SVGElement.cjs"));
const SVGGraphicsElement_js_1 = __importDefault(require("../nodes/svg-element/SVGGraphicsElement.cjs"));
const HTMLScriptElement_js_1 = __importDefault(require("../nodes/html-script-element/HTMLScriptElement.cjs"));
const HTMLImageElement_js_1 = __importDefault(require("../nodes/html-image-element/HTMLImageElement.cjs"));
const Image_js_1 = __importDefault(require("../nodes/html-image-element/Image.cjs"));
const DocumentFragment_js_1 = __importDefault(require("../nodes/document-fragment/DocumentFragment.cjs"));
const CharacterData_js_1 = __importDefault(require("../nodes/character-data/CharacterData.cjs"));
const NodeIterator_js_1 = __importDefault(require("../tree-walker/NodeIterator.cjs"));
const TreeWalker_js_1 = __importDefault(require("../tree-walker/TreeWalker.cjs"));
const Event_js_1 = __importDefault(require("../event/Event.cjs"));
const CustomEvent_js_1 = __importDefault(require("../event/events/CustomEvent.cjs"));
const AnimationEvent_js_1 = __importDefault(require("../event/events/AnimationEvent.cjs"));
const KeyboardEvent_js_1 = __importDefault(require("../event/events/KeyboardEvent.cjs"));
const MessageEvent_js_1 = __importDefault(require("../event/events/MessageEvent.cjs"));
const ProgressEvent_js_1 = __importDefault(require("../event/events/ProgressEvent.cjs"));
const MediaQueryListEvent_js_1 = __importDefault(require("../event/events/MediaQueryListEvent.cjs"));
const EventTarget_js_1 = __importDefault(require("../event/EventTarget.cjs"));
const MessagePort_js_1 = __importDefault(require("../event/MessagePort.cjs"));
const url_1 = require("url");
const URL_js_1 = __importDefault(require("../url/URL.cjs"));
const Location_js_1 = __importDefault(require("../location/Location.cjs"));
const MutationObserver_js_1 = __importDefault(require("../mutation-observer/MutationObserver.cjs"));
const MutationRecord_js_1 = __importDefault(require("../mutation-observer/MutationRecord.cjs"));
const DOMParser_js_1 = __importDefault(require("../dom-parser/DOMParser.cjs"));
const XMLSerializer_js_1 = __importDefault(require("../xml-serializer/XMLSerializer.cjs"));
const ResizeObserver_js_1 = __importDefault(require("../resize-observer/ResizeObserver.cjs"));
const Blob_js_1 = __importDefault(require("../file/Blob.cjs"));
const File_js_1 = __importDefault(require("../file/File.cjs"));
const DOMException_js_1 = __importDefault(require("../exception/DOMException.cjs"));
const FileReader_js_1 = __importDefault(require("../file/FileReader.cjs"));
const History_js_1 = __importDefault(require("../history/History.cjs"));
const CSSStyleSheet_js_1 = __importDefault(require("../css/CSSStyleSheet.cjs"));
const CSSStyleDeclaration_js_1 = __importDefault(require("../css/declaration/CSSStyleDeclaration.cjs"));
const CSS_js_1 = __importDefault(require("../css/CSS.cjs"));
const CSSUnitValue_js_1 = __importDefault(require("../css/CSSUnitValue.cjs"));
const CSSRule_js_1 = __importDefault(require("../css/CSSRule.cjs"));
const CSSContainerRule_js_1 = __importDefault(require("../css/rules/CSSContainerRule.cjs"));
const CSSFontFaceRule_js_1 = __importDefault(require("../css/rules/CSSFontFaceRule.cjs"));
const CSSKeyframeRule_js_1 = __importDefault(require("../css/rules/CSSKeyframeRule.cjs"));
const CSSKeyframesRule_js_1 = __importDefault(require("../css/rules/CSSKeyframesRule.cjs"));
const CSSMediaRule_js_1 = __importDefault(require("../css/rules/CSSMediaRule.cjs"));
const CSSStyleRule_js_1 = __importDefault(require("../css/rules/CSSStyleRule.cjs"));
const CSSSupportsRule_js_1 = __importDefault(require("../css/rules/CSSSupportsRule.cjs"));
const MouseEvent_js_1 = __importDefault(require("../event/events/MouseEvent.cjs"));
const PointerEvent_js_1 = __importDefault(require("../event/events/PointerEvent.cjs"));
const FocusEvent_js_1 = __importDefault(require("../event/events/FocusEvent.cjs"));
const WheelEvent_js_1 = __importDefault(require("../event/events/WheelEvent.cjs"));
const DataTransfer_js_1 = __importDefault(require("../event/DataTransfer.cjs"));
const DataTransferItem_js_1 = __importDefault(require("../event/DataTransferItem.cjs"));
const DataTransferItemList_js_1 = __importDefault(require("../event/DataTransferItemList.cjs"));
const InputEvent_js_1 = __importDefault(require("../event/events/InputEvent.cjs"));
const UIEvent_js_1 = __importDefault(require("../event/UIEvent.cjs"));
const ErrorEvent_js_1 = __importDefault(require("../event/events/ErrorEvent.cjs"));
const StorageEvent_js_1 = __importDefault(require("../event/events/StorageEvent.cjs"));
const SubmitEvent_js_1 = __importDefault(require("../event/events/SubmitEvent.cjs"));
const Screen_js_1 = __importDefault(require("../screen/Screen.cjs"));
const AsyncTaskManager_js_1 = __importDefault(require("../async-task-manager/AsyncTaskManager.cjs"));
const Headers_js_1 = __importDefault(require("../fetch/Headers.cjs"));
const Request_js_1 = __importDefault(require("../fetch/Request.cjs"));
const Response_js_1 = __importDefault(require("../fetch/Response.cjs"));
const Storage_js_1 = __importDefault(require("../storage/Storage.cjs"));
const HTMLCollection_js_1 = __importDefault(require("../nodes/element/HTMLCollection.cjs"));
const HTMLFormControlsCollection_js_1 = __importDefault(require("../nodes/html-form-element/HTMLFormControlsCollection.cjs"));
const NodeList_js_1 = __importDefault(require("../nodes/node/NodeList.cjs"));
const MediaQueryList_js_1 = __importDefault(require("../match-media/MediaQueryList.cjs"));
const Selection_js_1 = __importDefault(require("../selection/Selection.cjs"));
const Navigator_js_1 = __importDefault(require("../navigator/Navigator.cjs"));
const MimeType_js_1 = __importDefault(require("../navigator/MimeType.cjs"));
const MimeTypeArray_js_1 = __importDefault(require("../navigator/MimeTypeArray.cjs"));
const Plugin_js_1 = __importDefault(require("../navigator/Plugin.cjs"));
const PluginArray_js_1 = __importDefault(require("../navigator/PluginArray.cjs"));
const Fetch_js_1 = __importDefault(require("../fetch/Fetch.cjs"));
const Range_js_1 = __importDefault(require("../range/Range.cjs"));
const VMGlobalPropertyScript_js_1 = __importDefault(require("./VMGlobalPropertyScript.cjs"));
const PerfHooks = __importStar(require("perf_hooks"));
const vm_1 = __importDefault(require("vm"));
const buffer_1 = require("buffer");
const crypto_1 = require("crypto");
const XMLHttpRequest_js_1 = __importDefault(require("../xml-http-request/XMLHttpRequest.cjs"));
const XMLHttpRequestUpload_js_1 = __importDefault(require("../xml-http-request/XMLHttpRequestUpload.cjs"));
const XMLHttpRequestEventTarget_js_1 = __importDefault(require("../xml-http-request/XMLHttpRequestEventTarget.cjs"));
const Base64_js_1 = __importDefault(require("../base64/Base64.cjs"));
const Attr_js_1 = __importDefault(require("../nodes/attr/Attr.cjs"));
const NamedNodeMap_js_1 = __importDefault(require("../named-node-map/NamedNodeMap.cjs"));
const ProcessingInstruction_js_1 = __importDefault(require("../nodes/processing-instruction/ProcessingInstruction.cjs"));
const FileList_js_1 = __importDefault(require("../nodes/html-input-element/FileList.cjs"));
const stream_1 = __importDefault(require("stream"));
const FormData_js_1 = __importDefault(require("../form-data/FormData.cjs"));
const AbortController_js_1 = __importDefault(require("../fetch/AbortController.cjs"));
const AbortSignal_js_1 = __importDefault(require("../fetch/AbortSignal.cjs"));
const DOMExceptionNameEnum_js_1 = __importDefault(require("../exception/DOMExceptionNameEnum.cjs"));
const WindowErrorUtility_js_1 = __importDefault(require("./WindowErrorUtility.cjs"));
const VirtualConsole_js_1 = __importDefault(require("../console/VirtualConsole.cjs"));
const VirtualConsolePrinter_js_1 = __importDefault(require("../console/VirtualConsolePrinter.cjs"));
const version_js_1 = __importDefault(require("../version.cjs"));
const Permissions_js_1 = __importDefault(require("../permissions/Permissions.cjs"));
const PermissionStatus_js_1 = __importDefault(require("../permissions/PermissionStatus.cjs"));
const Clipboard_js_1 = __importDefault(require("../clipboard/Clipboard.cjs"));
const ClipboardItem_js_1 = __importDefault(require("../clipboard/ClipboardItem.cjs"));
const ClipboardEvent_js_1 = __importDefault(require("../event/events/ClipboardEvent.cjs"));
const ORIGINAL_SET_TIMEOUT = setTimeout;
const ORIGINAL_CLEAR_TIMEOUT = clearTimeout;
const ORIGINAL_SET_INTERVAL = setInterval;
const ORIGINAL_CLEAR_INTERVAL = clearInterval;
const ORIGINAL_QUEUE_MICROTASK = queueMicrotask;
/**
 * Browser window.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/Window.
 */
class Window extends EventTarget_js_1.default {
    /**
     * Constructor.
     *
     * @param [options] Options.
     * @param [options.width] Window width. Defaults to "1024".
     * @param [options.height] Window height. Defaults to "768".
     * @param [options.innerWidth] Inner width. Deprecated. Defaults to "1024".
     * @param [options.innerHeight] Inner height. Deprecated. Defaults to "768".
     * @param [options.url] URL.
     * @param [options.settings] Settings.
     */
    constructor(options) {
        super();
        // Happy DOM property.
        this.happyDOM = {
            whenAsyncComplete: async () => {
                return await this.happyDOM.asyncTaskManager.whenComplete();
            },
            cancelAsync: () => {
                this.happyDOM.asyncTaskManager.cancelAll();
            },
            asyncTaskManager: new AsyncTaskManager_js_1.default(),
            setWindowSize: (options) => {
                if ((options.width !== undefined && this.innerWidth !== options.width) ||
                    (options.height !== undefined && this.innerHeight !== options.height)) {
                    if (options.width !== undefined && this.innerWidth !== options.width) {
                        this.innerWidth = options.width;
                        this.outerWidth = options.width;
                    }
                    if (options.height !== undefined && this.innerHeight !== options.height) {
                        this.innerHeight = options.height;
                        this.outerHeight = options.height;
                    }
                    this.dispatchEvent(new Event_js_1.default('resize'));
                }
            },
            virtualConsolePrinter: null,
            setURL: (url) => {
                this.location.href = url;
            },
            settings: {
                disableJavaScriptEvaluation: false,
                disableJavaScriptFileLoading: false,
                disableCSSFileLoading: false,
                disableIframePageLoading: false,
                disableComputedStyleRendering: false,
                disableErrorCapturing: false,
                enableFileSystemHttpRequests: false,
                navigator: {
                    userAgent: `Mozilla/5.0 (X11; ${process.platform.charAt(0).toUpperCase() + process.platform.slice(1) + ' ' + process.arch}) AppleWebKit/537.36 (KHTML, like Gecko) HappyDOM/${version_js_1.default.version}`
                },
                device: {
                    prefersColorScheme: 'light',
                    mediaType: 'screen'
                }
            },
            setInnerWidth: (width) => this.happyDOM.setWindowSize({ width }),
            setInnerHeight: (height) => this.happyDOM.setWindowSize({ height })
        };
        // Nodes
        this.Node = Node_js_1.default;
        this.Attr = Attr_js_1.default;
        this.SVGSVGElement = SVGSVGElement_js_1.default;
        this.SVGElement = SVGElement_js_1.default;
        this.SVGGraphicsElement = SVGGraphicsElement_js_1.default;
        this.Text = Text_js_1.default;
        this.Comment = Comment_js_1.default;
        this.ShadowRoot = ShadowRoot_js_1.default;
        this.ProcessingInstruction = ProcessingInstruction_js_1.default;
        this.Element = Element_js_1.default;
        this.CharacterData = CharacterData_js_1.default;
        this.Document = Document_js_1.default;
        this.HTMLDocument = HTMLDocument_js_1.default;
        this.XMLDocument = XMLDocument_js_1.default;
        this.SVGDocument = SVGDocument_js_1.default;
        // Element classes
        this.HTMLElement = HTMLElement_js_1.default;
        this.HTMLUnknownElement = HTMLUnknownElement_js_1.default;
        this.HTMLTemplateElement = HTMLTemplateElement_js_1.default;
        this.HTMLFormElement = HTMLFormElement_js_1.default;
        this.HTMLInputElement = HTMLInputElement_js_1.default;
        this.HTMLSelectElement = HTMLSelectElement_js_1.default;
        this.HTMLTextAreaElement = HTMLTextAreaElement_js_1.default;
        this.HTMLImageElement = HTMLImageElement_js_1.default;
        this.HTMLScriptElement = HTMLScriptElement_js_1.default;
        this.HTMLLinkElement = HTMLLinkElement_js_1.default;
        this.HTMLStyleElement = HTMLStyleElement_js_1.default;
        this.HTMLLabelElement = HTMLLabelElement_js_1.default;
        this.HTMLSlotElement = HTMLSlotElement_js_1.default;
        this.HTMLMetaElement = HTMLMetaElement_js_1.default;
        this.HTMLMediaElement = HTMLMediaElement_js_1.default;
        this.HTMLAudioElement = HTMLAudioElement_js_1.default;
        this.HTMLVideoElement = HTMLVideoElement_js_1.default;
        this.HTMLBaseElement = HTMLBaseElement_js_1.default;
        this.HTMLIFrameElement = HTMLIFrameElement_js_1.default;
        this.HTMLDialogElement = HTMLDialogElement_js_1.default;
        // Non-implemented element classes
        this.HTMLHeadElement = HTMLElement_js_1.default;
        this.HTMLTitleElement = HTMLElement_js_1.default;
        this.HTMLBodyElement = HTMLElement_js_1.default;
        this.HTMLHeadingElement = HTMLElement_js_1.default;
        this.HTMLParagraphElement = HTMLElement_js_1.default;
        this.HTMLHRElement = HTMLElement_js_1.default;
        this.HTMLPreElement = HTMLElement_js_1.default;
        this.HTMLUListElement = HTMLElement_js_1.default;
        this.HTMLOListElement = HTMLElement_js_1.default;
        this.HTMLLIElement = HTMLElement_js_1.default;
        this.HTMLMenuElement = HTMLElement_js_1.default;
        this.HTMLDListElement = HTMLElement_js_1.default;
        this.HTMLDivElement = HTMLElement_js_1.default;
        this.HTMLAnchorElement = HTMLElement_js_1.default;
        this.HTMLAreaElement = HTMLElement_js_1.default;
        this.HTMLBRElement = HTMLElement_js_1.default;
        this.HTMLButtonElement = HTMLElement_js_1.default;
        this.HTMLCanvasElement = HTMLElement_js_1.default;
        this.HTMLDataElement = HTMLElement_js_1.default;
        this.HTMLDataListElement = HTMLElement_js_1.default;
        this.HTMLDetailsElement = HTMLElement_js_1.default;
        this.HTMLDirectoryElement = HTMLElement_js_1.default;
        this.HTMLFieldSetElement = HTMLElement_js_1.default;
        this.HTMLFontElement = HTMLElement_js_1.default;
        this.HTMLHtmlElement = HTMLElement_js_1.default;
        this.HTMLLegendElement = HTMLElement_js_1.default;
        this.HTMLMapElement = HTMLElement_js_1.default;
        this.HTMLMarqueeElement = HTMLElement_js_1.default;
        this.HTMLMeterElement = HTMLElement_js_1.default;
        this.HTMLModElement = HTMLElement_js_1.default;
        this.HTMLOutputElement = HTMLElement_js_1.default;
        this.HTMLPictureElement = HTMLElement_js_1.default;
        this.HTMLProgressElement = HTMLElement_js_1.default;
        this.HTMLQuoteElement = HTMLElement_js_1.default;
        this.HTMLSourceElement = HTMLElement_js_1.default;
        this.HTMLSpanElement = HTMLElement_js_1.default;
        this.HTMLTableCaptionElement = HTMLElement_js_1.default;
        this.HTMLTableCellElement = HTMLElement_js_1.default;
        this.HTMLTableColElement = HTMLElement_js_1.default;
        this.HTMLTableElement = HTMLElement_js_1.default;
        this.HTMLTimeElement = HTMLElement_js_1.default;
        this.HTMLTableRowElement = HTMLElement_js_1.default;
        this.HTMLTableSectionElement = HTMLElement_js_1.default;
        this.HTMLFrameElement = HTMLElement_js_1.default;
        this.HTMLFrameSetElement = HTMLElement_js_1.default;
        this.HTMLEmbedElement = HTMLElement_js_1.default;
        this.HTMLObjectElement = HTMLElement_js_1.default;
        this.HTMLParamElement = HTMLElement_js_1.default;
        this.HTMLTrackElement = HTMLElement_js_1.default;
        // Events classes
        this.Event = Event_js_1.default;
        this.UIEvent = UIEvent_js_1.default;
        this.CustomEvent = CustomEvent_js_1.default;
        this.AnimationEvent = AnimationEvent_js_1.default;
        this.KeyboardEvent = KeyboardEvent_js_1.default;
        this.MessageEvent = MessageEvent_js_1.default;
        this.MouseEvent = MouseEvent_js_1.default;
        this.PointerEvent = PointerEvent_js_1.default;
        this.FocusEvent = FocusEvent_js_1.default;
        this.WheelEvent = WheelEvent_js_1.default;
        this.InputEvent = InputEvent_js_1.default;
        this.ErrorEvent = ErrorEvent_js_1.default;
        this.StorageEvent = StorageEvent_js_1.default;
        this.SubmitEvent = SubmitEvent_js_1.default;
        this.ProgressEvent = ProgressEvent_js_1.default;
        this.MediaQueryListEvent = MediaQueryListEvent_js_1.default;
        this.ClipboardEvent = ClipboardEvent_js_1.default;
        // Non-implemented event classes
        this.AudioProcessingEvent = Event_js_1.default;
        this.BeforeInputEvent = Event_js_1.default;
        this.BeforeUnloadEvent = Event_js_1.default;
        this.BlobEvent = Event_js_1.default;
        this.CloseEvent = Event_js_1.default;
        this.CompositionEvent = Event_js_1.default;
        this.CSSFontFaceLoadEvent = Event_js_1.default;
        this.DeviceLightEvent = Event_js_1.default;
        this.DeviceMotionEvent = Event_js_1.default;
        this.DeviceOrientationEvent = Event_js_1.default;
        this.DeviceProximityEvent = Event_js_1.default;
        this.DOMTransactionEvent = Event_js_1.default;
        this.DragEvent = Event_js_1.default;
        this.EditingBeforeInputEvent = Event_js_1.default;
        this.FetchEvent = Event_js_1.default;
        this.GamepadEvent = Event_js_1.default;
        this.HashChangeEvent = Event_js_1.default;
        this.IDBVersionChangeEvent = Event_js_1.default;
        this.MediaStreamEvent = Event_js_1.default;
        this.MutationEvent = Event_js_1.default;
        this.OfflineAudioCompletionEvent = Event_js_1.default;
        this.OverconstrainedError = Event_js_1.default;
        this.PageTransitionEvent = Event_js_1.default;
        this.PaymentRequestUpdateEvent = Event_js_1.default;
        this.PopStateEvent = Event_js_1.default;
        this.RelatedEvent = Event_js_1.default;
        this.RTCDataChannelEvent = Event_js_1.default;
        this.RTCIdentityErrorEvent = Event_js_1.default;
        this.RTCIdentityEvent = Event_js_1.default;
        this.RTCPeerConnectionIceEvent = Event_js_1.default;
        this.SensorEvent = Event_js_1.default;
        this.SVGEvent = Event_js_1.default;
        this.SVGZoomEvent = Event_js_1.default;
        this.TimeEvent = Event_js_1.default;
        this.TouchEvent = Event_js_1.default;
        this.TrackEvent = Event_js_1.default;
        this.TransitionEvent = Event_js_1.default;
        this.UserProximityEvent = Event_js_1.default;
        this.WebGLContextEvent = Event_js_1.default;
        this.TextEvent = Event_js_1.default;
        // Other classes
        this.NamedNodeMap = NamedNodeMap_js_1.default;
        this.NodeFilter = NodeFilter_js_1.default;
        this.NodeIterator = NodeIterator_js_1.default;
        this.TreeWalker = TreeWalker_js_1.default;
        this.MutationObserver = MutationObserver_js_1.default;
        this.MutationRecord = MutationRecord_js_1.default;
        this.EventTarget = EventTarget_js_1.default;
        this.MessagePort = MessagePort_js_1.default;
        this.DataTransfer = DataTransfer_js_1.default;
        this.DataTransferItem = DataTransferItem_js_1.default;
        this.DataTransferItemList = DataTransferItemList_js_1.default;
        this.URL = URL_js_1.default;
        this.Location = Location_js_1.default;
        this.CustomElementRegistry = CustomElementRegistry_js_1.default;
        this.Window = this.constructor;
        this.XMLSerializer = XMLSerializer_js_1.default;
        this.ResizeObserver = ResizeObserver_js_1.default;
        this.CSSStyleSheet = CSSStyleSheet_js_1.default;
        this.Blob = Blob_js_1.default;
        this.File = File_js_1.default;
        this.DOMException = DOMException_js_1.default;
        this.History = History_js_1.default;
        this.Screen = Screen_js_1.default;
        this.Storage = Storage_js_1.default;
        this.URLSearchParams = url_1.URLSearchParams;
        this.HTMLCollection = HTMLCollection_js_1.default;
        this.HTMLFormControlsCollection = HTMLFormControlsCollection_js_1.default;
        this.NodeList = NodeList_js_1.default;
        this.CSSUnitValue = CSSUnitValue_js_1.default;
        this.CSSRule = CSSRule_js_1.default;
        this.CSSContainerRule = CSSContainerRule_js_1.default;
        this.CSSFontFaceRule = CSSFontFaceRule_js_1.default;
        this.CSSKeyframeRule = CSSKeyframeRule_js_1.default;
        this.CSSKeyframesRule = CSSKeyframesRule_js_1.default;
        this.CSSMediaRule = CSSMediaRule_js_1.default;
        this.CSSStyleRule = CSSStyleRule_js_1.default;
        this.CSSSupportsRule = CSSSupportsRule_js_1.default;
        this.Selection = Selection_js_1.default;
        this.Navigator = Navigator_js_1.default;
        this.MimeType = MimeType_js_1.default;
        this.MimeTypeArray = MimeTypeArray_js_1.default;
        this.Plugin = Plugin_js_1.default;
        this.PluginArray = PluginArray_js_1.default;
        this.FileList = FileList_js_1.default;
        this.Headers = Headers_js_1.default;
        this.XMLHttpRequestUpload = XMLHttpRequestUpload_js_1.default;
        this.XMLHttpRequestEventTarget = XMLHttpRequestEventTarget_js_1.default;
        this.ReadableStream = stream_1.default.Readable;
        this.WritableStream = stream_1.default.Writable;
        this.TransformStream = stream_1.default.Transform;
        this.AbortController = AbortController_js_1.default;
        this.AbortSignal = AbortSignal_js_1.default;
        this.FormData = FormData_js_1.default;
        this.Permissions = Permissions_js_1.default;
        this.PermissionStatus = PermissionStatus_js_1.default;
        this.Clipboard = Clipboard_js_1.default;
        this.ClipboardItem = ClipboardItem_js_1.default;
        this.CSSStyleDeclaration = CSSStyleDeclaration_js_1.default;
        // Events
        this.onload = null;
        this.onerror = null;
        this.self = this;
        this.top = this;
        this.parent = this;
        this.window = this;
        this.globalThis = this;
        this.devicePixelRatio = 1;
        this.performance = PerfHooks.performance;
        this.innerWidth = 1024;
        this.innerHeight = 768;
        this.outerWidth = 1024;
        this.outerHeight = 768;
        this.crypto = crypto_1.webcrypto;
        this.Buffer = buffer_1.Buffer;
        // Public internal properties
        // Used for tracking capture event listeners to improve performance when they are not used.
        // See EventTarget class.
        this._captureEventListenerCount = {};
        this.customElements = new CustomElementRegistry_js_1.default();
        this.location = new Location_js_1.default();
        this.navigator = new Navigator_js_1.default(this);
        this.history = new History_js_1.default();
        this.screen = new Screen_js_1.default();
        this.sessionStorage = new Storage_js_1.default();
        this.localStorage = new Storage_js_1.default();
        if (options) {
            if (options.width !== undefined) {
                this.innerWidth = options.width;
                this.outerWidth = options.width;
            }
            else if (options.innerWidth !== undefined) {
                this.innerWidth = options.innerWidth;
                this.outerWidth = options.innerWidth;
            }
            if (options.height !== undefined) {
                this.innerHeight = options.height;
                this.outerHeight = options.height;
            }
            else if (options.innerHeight !== undefined) {
                this.innerHeight = options.innerHeight;
                this.outerHeight = options.innerHeight;
            }
            if (options.url !== undefined) {
                this.location.href = options.url;
            }
            if (options.settings) {
                this.happyDOM.settings = {
                    ...this.happyDOM.settings,
                    ...options.settings,
                    navigator: {
                        ...this.happyDOM.settings.navigator,
                        ...options.settings.navigator
                    },
                    device: {
                        ...this.happyDOM.settings.device,
                        ...options.settings.device
                    }
                };
            }
        }
        if (options && options.console) {
            this.console = options.console;
        }
        else {
            this.happyDOM.virtualConsolePrinter = new VirtualConsolePrinter_js_1.default();
            this.console = new VirtualConsole_js_1.default(this.happyDOM.virtualConsolePrinter);
        }
        this._setTimeout = ORIGINAL_SET_TIMEOUT;
        this._clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
        this._setInterval = ORIGINAL_SET_INTERVAL;
        this._clearInterval = ORIGINAL_CLEAR_INTERVAL;
        this._queueMicrotask = ORIGINAL_QUEUE_MICROTASK;
        // Binds all methods to "this", so that it will use the correct context when called globally.
        for (const key of Object.getOwnPropertyNames(Window.prototype).concat(Object.getOwnPropertyNames(EventTarget_js_1.default.prototype))) {
            if (key !== 'constructor' &&
                key[0] !== '_' &&
                key[0] === key[0].toLowerCase() &&
                typeof this[key] === 'function') {
                this[key] = this[key].bind(this);
            }
        }
        HTMLDocument_js_1.default._defaultView = this;
        HTMLDocument_js_1.default._windowClass = Window;
        const document = new HTMLDocument_js_1.default();
        this.document = document;
        // We need to set the correct owner document when the class is constructed.
        // To achieve this we will extend the original implementation with a class that sets the owner document.
        Response_js_1.default._ownerDocument = document;
        Request_js_1.default._ownerDocument = document;
        Image_js_1.default._ownerDocument = document;
        DocumentFragment_js_1.default._ownerDocument = document;
        FileReader_js_1.default._ownerDocument = document;
        DOMParser_js_1.default._ownerDocument = document;
        Range_js_1.default._ownerDocument = document;
        XMLHttpRequest_js_1.default._ownerDocument = document;
        /* eslint-disable jsdoc/require-jsdoc */
        class Response extends Response_js_1.default {
        }
        Response._ownerDocument = document;
        class Request extends Request_js_1.default {
        }
        Request._ownerDocument = document;
        class Image extends Image_js_1.default {
        }
        Image._ownerDocument = document;
        class DocumentFragment extends DocumentFragment_js_1.default {
        }
        DocumentFragment._ownerDocument = document;
        class FileReader extends FileReader_js_1.default {
        }
        FileReader._ownerDocument = document;
        class DOMParser extends DOMParser_js_1.default {
        }
        DOMParser._ownerDocument = document;
        class XMLHttpRequest extends XMLHttpRequest_js_1.default {
        }
        XMLHttpRequest._ownerDocument = document;
        class Range extends Range_js_1.default {
        }
        Range._ownerDocument = document;
        class Audio extends Audio_js_1.default {
        }
        Audio._ownerDocument = document;
        /* eslint-enable jsdoc/require-jsdoc */
        this.Response = Response;
        this.Request = Request;
        this.Image = Image;
        this.DocumentFragment = DocumentFragment;
        this.FileReader = FileReader;
        this.DOMParser = DOMParser;
        this.XMLHttpRequest = XMLHttpRequest;
        this.Range = Range;
        this.Audio = Audio;
        this._setupVMContext();
        this.document._onWindowReady();
    }
    /**
     * The number of pixels that the document is currently scrolled horizontally
     *
     * @returns number
     */
    get scrollX() {
        return this.document?.documentElement?.scrollLeft ?? 0;
    }
    /**
     * The read-only Window property pageXOffset is an alias for scrollX.
     *
     * @returns number
     */
    get pageXOffset() {
        return this.scrollX;
    }
    /**
     * The number of pixels that the document is currently scrolled vertically
     *
     * @returns number
     */
    get scrollY() {
        return this.document?.documentElement?.scrollTop ?? 0;
    }
    /**
     * The read-only Window property pageYOffset is an alias for scrollY.
     *
     * @returns number
     */
    get pageYOffset() {
        return this.scrollY;
    }
    /**
     * The CSS interface holds useful CSS-related methods.
     *
     * @returns CSS interface.
     */
    get CSS() {
        return new CSS_js_1.default();
    }
    /**
     * Returns an object containing the values of all CSS properties of an element.
     *
     * @param element Element.
     * @returns CSS style declaration.
     */
    getComputedStyle(element) {
        element['_computedStyle'] = element['_computedStyle'] || new CSSStyleDeclaration_js_1.default(element, true);
        return element['_computedStyle'];
    }
    /**
     * Returns selection.
     *
     * @returns Selection.
     */
    getSelection() {
        return this.document.getSelection();
    }
    /**
     * Scrolls to a particular set of coordinates.
     *
     * @param x X position or options object.
     * @param y Y position.
     */
    scroll(x, y) {
        if (typeof x === 'object') {
            if (x.behavior === 'smooth') {
                this.setTimeout(() => {
                    if (x.top !== undefined) {
                        this.document.documentElement.scrollTop = x.top;
                    }
                    if (x.left !== undefined) {
                        this.document.documentElement.scrollLeft = x.left;
                    }
                });
            }
            else {
                if (x.top !== undefined) {
                    this.document.documentElement.scrollTop = x.top;
                }
                if (x.left !== undefined) {
                    this.document.documentElement.scrollLeft = x.left;
                }
            }
        }
        else if (x !== undefined && y !== undefined) {
            this.document.documentElement.scrollLeft = x;
            this.document.documentElement.scrollTop = y;
        }
    }
    /**
     * Scrolls to a particular set of coordinates.
     *
     * @param x X position or options object.
     * @param y Y position.
     */
    scrollTo(x, y) {
        this.scroll(x, y);
    }
    /**
     * Returns a new MediaQueryList object that can then be used to determine if the document matches the media query string.
     *
     * @param mediaQueryString A string specifying the media query to parse into a MediaQueryList.
     * @returns A new MediaQueryList.
     */
    matchMedia(mediaQueryString) {
        return new MediaQueryList_js_1.default({ ownerWindow: this, media: mediaQueryString });
    }
    /**
     * Sets a timer which executes a function once the timer expires.
     *
     * @param callback Function to be executed.
     * @param [delay=0] Delay in ms.
     * @param args Arguments passed to the callback function.
     * @returns Timeout ID.
     */
    setTimeout(callback, delay = 0, ...args) {
        const id = this._setTimeout(() => {
            if (this.happyDOM.settings.disableErrorCapturing) {
                callback(...args);
            }
            else {
                WindowErrorUtility_js_1.default.captureError(this, () => callback(...args));
            }
            this.happyDOM.asyncTaskManager.endTimer(id);
        }, delay);
        this.happyDOM.asyncTaskManager.startTimer(id);
        return id;
    }
    /**
     * Cancels a timeout previously established by calling setTimeout().
     *
     * @param id ID of the timeout.
     */
    clearTimeout(id) {
        this._clearTimeout(id);
        this.happyDOM.asyncTaskManager.endTimer(id);
    }
    /**
     * Calls a function with a fixed time delay between each call.
     *
     * @param callback Function to be executed.
     * @param [delay=0] Delay in ms.
     * @param args Arguments passed to the callback function.
     * @returns Interval ID.
     */
    setInterval(callback, delay = 0, ...args) {
        const id = this._setInterval(() => {
            if (this.happyDOM.settings.disableErrorCapturing) {
                callback(...args);
            }
            else {
                WindowErrorUtility_js_1.default.captureError(this, () => callback(...args), () => this.clearInterval(id));
            }
        }, delay);
        this.happyDOM.asyncTaskManager.startTimer(id);
        return id;
    }
    /**
     * Cancels a timed repeating action which was previously established by a call to setInterval().
     *
     * @param id ID of the interval.
     */
    clearInterval(id) {
        this._clearInterval(id);
        this.happyDOM.asyncTaskManager.endTimer(id);
    }
    /**
     * Mock animation frames with timeouts.
     *
     * @param callback Callback.
     * @returns ID.
     */
    requestAnimationFrame(callback) {
        const id = global.setImmediate(() => {
            if (this.happyDOM.settings.disableErrorCapturing) {
                callback(this.performance.now());
            }
            else {
                WindowErrorUtility_js_1.default.captureError(this, () => callback(this.performance.now()));
            }
            this.happyDOM.asyncTaskManager.endImmediate(id);
        });
        this.happyDOM.asyncTaskManager.startImmediate(id);
        return id;
    }
    /**
     * Mock animation frames with timeouts.
     *
     * @param id ID.
     */
    cancelAnimationFrame(id) {
        global.clearImmediate(id);
        this.happyDOM.asyncTaskManager.endImmediate(id);
    }
    /**
     * Queues a microtask to be executed at a safe time prior to control returning to the browser's event loop.
     *
     * @param callback Function to be executed.
     */
    queueMicrotask(callback) {
        let isAborted = false;
        const taskId = this.happyDOM.asyncTaskManager.startTask(() => (isAborted = true));
        this._queueMicrotask(() => {
            if (!isAborted) {
                if (this.happyDOM.settings.disableErrorCapturing) {
                    callback();
                }
                else {
                    WindowErrorUtility_js_1.default.captureError(this, callback);
                }
                this.happyDOM.asyncTaskManager.endTask(taskId);
            }
        });
    }
    /**
     * This method provides an easy, logical way to fetch resources asynchronously across the network.
     *
     * @param url URL.
     * @param [init] Init.
     * @returns Promise.
     */
    async fetch(url, init) {
        return await new Fetch_js_1.default({ ownerDocument: this.document, url, init }).send();
    }
    /**
     * Creates a Base64-encoded ASCII string from a binary string (i.e., a string in which each character in the string is treated as a byte of binary data).
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/btoa
     * @param data Binay data.
     * @returns Base64-encoded string.
     */
    btoa(data) {
        return Base64_js_1.default.btoa(data);
    }
    /**
     * Decodes a string of data which has been encoded using Base64 encoding.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/atob
     * @see https://infra.spec.whatwg.org/#forgiving-base64-encode.
     * @see Https://html.spec.whatwg.org/multipage/webappapis.html#btoa.
     * @param data Binay string.
     * @returns An ASCII string containing decoded data from encodedData.
     */
    atob(data) {
        return Base64_js_1.default.atob(data);
    }
    /**
     * Safely enables cross-origin communication between Window objects; e.g., between a page and a pop-up that it spawned, or between a page and an iframe embedded within it.
     *
     * @param message Message.
     * @param [targetOrigin=*] Target origin.
     * @param _transfer Transfer. Not implemented.
     */
    postMessage(message, targetOrigin = '*', _transfer) {
        // TODO: Implement transfer.
        if (targetOrigin && targetOrigin !== '*' && this.location.origin !== targetOrigin) {
            throw new DOMException_js_1.default(`Failed to execute 'postMessage' on 'Window': The target origin provided ('${targetOrigin}') does not match the recipient window\'s origin ('${this.location.origin}').`, DOMExceptionNameEnum_js_1.default.securityError);
        }
        try {
            JSON.stringify(message);
        }
        catch (error) {
            throw new DOMException_js_1.default(`Failed to execute 'postMessage' on 'Window': The provided message cannot be serialized.`, DOMExceptionNameEnum_js_1.default.invalidStateError);
        }
        this.window.setTimeout(() => this.dispatchEvent(new MessageEvent_js_1.default('message', {
            data: message,
            origin: this.parent.location.origin,
            source: this.parent,
            lastEventId: ''
        })));
    }
    /**
     * Setup of VM context.
     */
    _setupVMContext() {
        if (!vm_1.default.isContext(this)) {
            vm_1.default.createContext(this);
            // Sets global properties from the VM to the Window object.
            // Otherwise "this.Array" will be undefined for example.
            VMGlobalPropertyScript_js_1.default.runInContext(this);
        }
    }
}
exports.default = Window;
//# sourceMappingURL=Window.cjs.map
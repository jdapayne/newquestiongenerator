/** d.ts for tingle. All _ methods are ommitted */

declare class Modal {
  constructor(options: Record<string,any>);
  opts: Record<string,any>;
  modal: HTMLDivElement
  modalBoxContent: HTMLDivElement
  modalBoxFooter: HTMLDivElement
  modalBox: HTMLDivElement
  modalCloseBtn: HTMLButtonElement
  modalCloseBtnIcon: HTMLSpanElement
  modalCloseBtnLabel: HTMLSpanElement


  init(): Modal;
  destroy(): void;
  isOpen(): boolean;
  open(): Modal;
  close(force?: boolean): void;
  setContent(content: string | HTMLElement): Modal;
  getContent(): HTMLElement;
  addFooter(): Modal;
  setFooterContent(content: any): Modal;
  getFooterContent(): HTMLElement;
  setStickyFooter(isSticky: boolean): Modal;
  addFooterBtn(label: any, cssClass: any, callback: any): HTMLButtonElement;
  resize(): void;
  isOverflow(): boolean;
  checkOverflow(): void;
}
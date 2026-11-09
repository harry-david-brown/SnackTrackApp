/** Synchronous admission and fencing for one owner/interaction lifetime. */
export class FlowAttemptScope {
  private sequence = 0;
  private current: number | null = null;
  private active = true;

  isLive(): boolean {
    return this.active;
  }

  begin(): number | null {
    if (!this.active || this.current !== null) return null;
    this.current = ++this.sequence;
    return this.current;
  }
  owns(attempt: number): boolean {
    return this.active && this.current === attempt;
  }
  finish(attempt: number): void {
    if (this.owns(attempt)) this.current = null;
  }
  invalidate(): void {
    this.active = false;
    this.current = null;
    ++this.sequence;
  }
  activate(): void {
    this.active = true;
  }
}

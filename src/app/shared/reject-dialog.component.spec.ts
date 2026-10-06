import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { REJECTION_MAX } from './validation/rejection-reason.schema';
import { RejectDialogComponent } from './reject-dialog.component';

async function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(RejectDialogComponent);
  fixture.componentRef.setInput('subject', 'this review');
  fixture.detectChanges();
  await Promise.resolve(); // the dialog opens on a microtask
  const el = fixture.nativeElement as HTMLElement;
  const reasons: string[] = [];
  fixture.componentInstance.rejected.subscribe((reason) => reasons.push(reason));
  const confirm = el.querySelector<HTMLButtonElement>('button.danger');
  const type = (text: string) => {
    const box = el.querySelector('textarea');
    if (!box) throw new Error('No textarea');
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { confirm, el, fixture, reasons, type };
}

describe('RejectDialogComponent', () => {
  it('opens as a modal asking what is being rejected', async () => {
    const { el } = await setup();
    expect(el.querySelector('dialog')?.open).toBeTrue();
    expect(el.textContent).toContain('Reject this review');
  });

  it('blocks an empty or blank reason', async () => {
    const { confirm, type } = await setup();
    expect(confirm?.disabled).toBeTrue();
    type('   ');
    expect(confirm?.disabled).toBeTrue();
  });

  it('sends the trimmed reason', async () => {
    const { confirm, reasons, type } = await setup();
    type('  Spam  ');
    confirm?.click();
    expect(reasons).toEqual(['Spam']);
  });

  it('fills the box from a preset and keeps it editable', async () => {
    const { confirm, el, fixture, reasons, type } = await setup();
    [...el.querySelectorAll<HTMLButtonElement>('.presets button')]
      .find((b) => b.textContent?.includes('Spam'))
      ?.click();
    fixture.detectChanges();
    expect(el.querySelector('textarea')?.value).toBe('Spam');
    expect(confirm?.disabled).toBeFalse();

    type('Spam, repeated');
    confirm?.click();
    expect(reasons).toEqual(['Spam, repeated']);
  });

  it('blocks a reason that is too long', async () => {
    const { confirm, type } = await setup();
    type('a'.repeat(REJECTION_MAX + 1));
    expect(confirm?.disabled).toBeTrue();
  });

  it('links to the guidelines in a new tab', async () => {
    const { el } = await setup();
    const link = el.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/moderation-guidelines');
    expect(link?.getAttribute('target')).toBe('_blank');
  });
});

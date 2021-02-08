import { TestBed, async, inject } from '@angular/core/testing';

import { CanLeaveUnsavedNoteGuardGuard } from './can-leave-unsaved-note-guard.guard';

describe('CanLeaveUnsavedNoteGuardGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CanLeaveUnsavedNoteGuardGuard]
    });
  });

  it('should ...', inject([CanLeaveUnsavedNoteGuardGuard], (guard: CanLeaveUnsavedNoteGuardGuard) => {
    expect(guard).toBeTruthy();
  }));
});

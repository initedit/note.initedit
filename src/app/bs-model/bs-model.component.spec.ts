import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BsModelComponent } from './bs-model.component';

describe('BsModelComponent', () => {
  let component: BsModelComponent;
  let fixture: ComponentFixture<BsModelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BsModelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

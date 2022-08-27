import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualTransactionsPage } from './manual-transactions.page';

describe('ManualTransactionsPage', () => {
  let component: ManualTransactionsPage;
  let fixture: ComponentFixture<ManualTransactionsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManualTransactionsPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManualTransactionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

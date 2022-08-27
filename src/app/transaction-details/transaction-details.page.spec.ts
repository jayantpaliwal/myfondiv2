import { TransactionDetailsPage } from './transaction-details.page';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';


describe('TransactionDetailsPage', () => {
  let component: TransactionDetailsPage;
  let fixture: ComponentFixture<TransactionDetailsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TransactionDetailsPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransactionDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

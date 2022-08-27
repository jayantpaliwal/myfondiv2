import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AddIncomePage } from './add-income.page';



describe('AddIncomePage', () => {
  let component: AddIncomePage;
  let fixture: ComponentFixture<AddIncomePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddIncomePage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddIncomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

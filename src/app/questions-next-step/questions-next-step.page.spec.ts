import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionsNextStepPage } from './questions-next-step.page';



describe('QuestionsNextStepPage', () => {
  let component: QuestionsNextStepPage;
  let fixture: ComponentFixture<QuestionsNextStepPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QuestionsNextStepPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionsNextStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ChangePaycheckPopupPage } from './change-paycheck-popup.page';

describe('ChangePaycheckPopupPage', () => {
  let component: ChangePaycheckPopupPage;
  let fixture: ComponentFixture<ChangePaycheckPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangePaycheckPopupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePaycheckPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

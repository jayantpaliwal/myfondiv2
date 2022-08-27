import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PaycheckPopupPage } from './paycheck-popup.page';

describe('PaycheckPopupPage', () => {
  let component: PaycheckPopupPage;
  let fixture: ComponentFixture<PaycheckPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PaycheckPopupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PaycheckPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

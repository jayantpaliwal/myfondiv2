import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PaycheckAllocationPopupPage } from './paycheck-allocation-popup.page';

describe('PaycheckAllocationPopupPage', () => {
  let component: PaycheckAllocationPopupPage;
  let fixture: ComponentFixture<PaycheckAllocationPopupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PaycheckAllocationPopupPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PaycheckAllocationPopupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

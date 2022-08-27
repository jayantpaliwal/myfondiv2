import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StripeSubscriptionPage } from './stripe-subscription.page';

describe('StripeSubscriptionPage', () => {
  let component: StripeSubscriptionPage;
  let fixture: ComponentFixture<StripeSubscriptionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StripeSubscriptionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StripeSubscriptionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

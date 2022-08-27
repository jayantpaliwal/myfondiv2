import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { PayPeriodsPage } from './pay-periods.page';




describe('PayPeriodsPage', () => {
  let component: PayPeriodsPage;
  let fixture: ComponentFixture<PayPeriodsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PayPeriodsPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PayPeriodsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

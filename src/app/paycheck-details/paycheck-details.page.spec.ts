import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { PaycheckDetailsPage } from './paycheck-details.page';



describe('PaychecksPage', () => {
  let component: PaycheckDetailsPage;
  let fixture: ComponentFixture<PaycheckDetailsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PaycheckDetailsPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(PaycheckDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

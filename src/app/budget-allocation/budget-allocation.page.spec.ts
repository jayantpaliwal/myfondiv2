import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BudgetAllocationPage } from './budget-allocation.page';




describe('BudgetAllocationPage', () => {
  let component: BudgetAllocationPage;
  let fixture: ComponentFixture<BudgetAllocationPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BudgetAllocationPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetAllocationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TransactionListPage } from './transaction-list.page';

describe('TransactionListPage', () => {
  let component: TransactionListPage;
  let fixture: ComponentFixture<TransactionListPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TransactionListPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

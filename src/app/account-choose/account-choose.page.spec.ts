import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AccountChoosePage } from './account-choose.page';

describe('AccountChoosePage', () => {
  let component: AccountChoosePage;
  let fixture: ComponentFixture<AccountChoosePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountChoosePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountChoosePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

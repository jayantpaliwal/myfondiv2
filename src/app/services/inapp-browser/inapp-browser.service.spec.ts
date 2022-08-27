import { TestBed } from '@angular/core/testing';

import { InappBrowserService } from './inapp-browser.service';

describe('InappBrowserService', () => {
  let service: InappBrowserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InappBrowserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'thousandSeparator'
})
export class ThousandSeparatorPipe implements PipeTransform {

  transform(x: any , sep?): any {
    x = isNaN(x) ? 0 : x;
        if (sep == null) {
            sep = ',';
        }
        if (parseInt(x) < 0) {
            x = Math.abs(x).toFixed(2);
            x = x.toString();
            var afterPoint = '';
            if (x.indexOf('.') > 0)
                afterPoint = x.substring(x.indexOf('.'), x.length);
            x = Math.floor(x);
            x = x.toString();
            var lastThree = x.substring(x.length - 3);
            var otherNumbers = x.substring(0, x.length - 3);
            if (otherNumbers != '')
                lastThree = ',' + lastThree;
            var res : any = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
            return '-$' + res;
        }
        else {
            x = (parseFloat(x).toFixed(2));
           var y=0;
            x = x.toString();
            var afterPoint = '';
            if (x.indexOf('.') > 0)
                afterPoint = x.substring(x.indexOf('.'), x.length);
            if(!(x < 0))
               x = Math.floor(x);
            else 
               y= parseFloat(x);
               x = Math.ceil(x);
            x = x.toString();
            var lastThree = x.substring(x.length - 3);
            var otherNumbers = x.substring(0, x.length - 3);
            if (otherNumbers != '')
                lastThree = ',' + lastThree;
            var res:any = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
            if(y!=0)
               return '-$' + res;
            else 
               return '$' +res;
        }
  }

}

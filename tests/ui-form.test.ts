import test from 'node:test';
import assert from 'node:assert/strict';
import {formInput,makeForm,shiftMonth} from '../src/state/form';
import {AppError} from '../src/errors';
import {choosePictureSize} from '../src/utils/cameraSize';
test('manual input allows an empty merchant and preserves optional item blanks',()=>{
 const input=formInput({...makeForm(),paidAt:'2026-11-18',total:'8000',items:[{name:'식사',quantity:'',amount:''}]});
 assert.equal(input.merchant,'');assert.equal(input.category,'기타');assert.equal(input.total,8000);assert.deepEqual(input.items,[{name:'식사',quantity:null,amount:null}]);
});
test('form reports date, amount and item errors together',()=>{
 assert.throws(()=>formInput({...makeForm(),paidAt:'2026-02-29',total:'0',items:[{name:'',quantity:'1.5',amount:'-1'}]}),(e:unknown)=>e instanceof AppError&&['paidAt','total','items.0.name','items.0.quantity','items.0.amount'].every(k=>Boolean(e.fields[k])));
});
test('reject decimals, exponents, negatives, blank and oversized totals',()=>{
 for(const total of ['','1.5','1e3','-1','1000000000'])assert.throws(()=>formInput({...makeForm(),total}));
 for(const total of ['1','999999999'])assert.equal(formInput({...makeForm(),total}).total,Number(total));
});
test('draft unknown date and amount remain blank for user review',()=>{
 const form=makeForm({merchant:'',paidAt:'',total:null,category:'기타',memo:'',items:[],warnings:[],reviewFields:[]});assert.equal(form.paidAt,'');assert.equal(form.total,'');assert.throws(()=>formInput(form));
});
test('month navigation crosses year boundaries',()=>{assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');});
test('camera resolution respects OCR pixel bounds and prefers 12MP or less',()=>{
 assert.equal(choosePictureSize(['8000x6000','4000x3000','1920x1080']),'4000x3000');
 assert.equal(choosePictureSize(['5000x3000','5000x4000']),'5000x3000');
 assert.equal(choosePictureSize(['bad','8000x6000']),undefined);
});

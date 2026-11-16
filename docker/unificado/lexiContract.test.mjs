import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizarRespuesta} from './lexiContract.mjs';
import {normalizarRespuesta as client,MENSAJES} from '../../frontend/src/services/lexiContract.js';
test('API y React imponen los mismos textos exactos y niegan banderas contradictorias',()=>{
 for(const estado of Object.keys(MENSAJES)){
  const data={orientacion:'Texto del modelo que no debe mostrarse',estado,mostrarAbogados:true};
  assert.deepEqual(normalizarRespuesta(data),client(data));assert.equal(normalizarRespuesta(data).orientacion,MENSAJES[estado]);
 }
});
test('el gateway bloquea el contrato antiguo, inválido o desconocido y exige true literal',()=>{
 for(const data of [{orientacion:'Legada'},{orientacion:'Texto',estado:'DESCONOCIDA',mostrarAbogados:true},{orientacion:5,estado:'RESPONDIDA'},{orientacion:'',estado:'RESPONDIDA'}])assert.throws(()=>normalizarRespuesta(data));
 for(const flag of [true,false,'true',1,undefined])assert.equal(normalizarRespuesta({orientacion:'Orientación',estado:'RESPONDIDA',mostrarAbogados:flag}).mostrarAbogados,flag===true);
});

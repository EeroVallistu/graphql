//Schema directive for skipping authentication
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver } from 'graphql';

export function skipAuthDirectiveTransformer(schema) {
  return mapSchema(schema, {
    // Apply directive to field
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const skipAuthDirective = getDirective(schema, fieldConfig, 'skipAuth')?.[0];
      
      if (skipAuthDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        
        // Replace resolver to skip auth check
        fieldConfig.resolve = async function (source, args, context, info) {
          // Mark this operation to skip auth check
          context.skipAuth = true;
          return resolve(source, args, context, info);
        };
        
        return fieldConfig;
      }
      return fieldConfig;
    }
  });
}

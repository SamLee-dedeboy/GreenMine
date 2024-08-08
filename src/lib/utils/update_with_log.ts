export function updateTmpData(tmp_data: any, log_record: any, version:string) {
    console.log('tmp_data', tmp_data);
    const baselineRecord = log_record.find(record => record.version === version);
  
    baselineRecord.identify_type_results.forEach((logItem: any) => {
      const tmpDataItem = tmp_data.identify_var_types.find((item: any) => item.id === logItem.id);
      
      if (tmpDataItem) {
        // Remove elements
        logItem.remove_element.forEach((removeItem: any) => {
          tmpDataItem.identify_var_types_result = tmpDataItem.identify_var_types_result.filter(
            (result: any) => result.var_type !== removeItem.var_type
          );
        });
  
        // Add elements
        logItem.add_element.forEach((addItem: any) => {
          const existingIndex = tmpDataItem.identify_var_types_result.findIndex(
            (result: any) => result.var_type === addItem.var_type
          );
  
          if (existingIndex === -1) {
            tmpDataItem.identify_var_types_result.push(addItem);
          } else {
            tmpDataItem.identify_var_types_result[existingIndex] = addItem;
          }
        });
      }
    });
  
    return tmp_data;
}
SELECT 
    name AS FileName, 
    size * 8 / 1024 AS SizeMB, 
    max_size, 
    growth, 
    is_percent_growth, 
    physical_name
FROM sys.master_files
WHERE database_id = DB_ID('BlueSkyClone');

SELECT 
    DB_NAME(database_id) AS DatabaseName, 
    Name AS LogicalName, 
    Physical_Name AS PhysicalName, 
    (size * 8) / 1024 AS SizeMB
FROM sys.master_files
WHERE database_id > 4; -- Show all user databases

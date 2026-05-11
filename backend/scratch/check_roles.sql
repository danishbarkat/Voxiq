SELECT u.email, r.name as role_name 
FROM "User" u 
JOIN "Role" r ON u."roleId" = r.id 
WHERE u.email = 'saliq@bytechsol.com';

SELECT * FROM "Role";

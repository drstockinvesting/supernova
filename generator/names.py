"""Name pools for synthetic people.

Drawn deliberately wide so the district reads like a real US public school
population rather than one demographic. Names are combined at random, so any
resemblance to a specific real person is coincidental -- and no name here is taken
from a real student record.
"""

from __future__ import annotations

FIRST_NAMES = [
    "Aaliyah", "Abel", "Adaeze", "Adrian", "Ahmad", "Aisha", "Alejandro", "Alice",
    "Amara", "Amir", "Anaya", "Andre", "Angelica", "Anh", "Anika", "Antoine",
    "Arjun", "Ashley", "Aurora", "Ayana", "Beatriz", "Benjamin", "Bianca", "Blake",
    "Brandon", "Brianna", "Caleb", "Camila", "Carlos", "Cassandra", "Cedric",
    "Chandra", "Charlotte", "Chidi", "Chloe", "Christopher", "Claudia", "Cole",
    "Corinne", "Daniel", "Daphne", "Darius", "Deandre", "Deja", "Desmond", "Diego",
    "Dimitri", "Dominic", "Eamon", "Ebony", "Eleanor", "Elena", "Eli", "Elias",
    "Elise", "Emeka", "Emilia", "Emmanuel", "Esperanza", "Ethan", "Evelyn", "Ezra",
    "Farida", "Felix", "Fiona", "Francisco", "Gabriel", "Genevieve", "Gideon",
    "Grace", "Gregory", "Hannah", "Harold", "Hassan", "Hazel", "Hector", "Helena",
    "Hiroshi", "Ibrahim", "Imani", "Ines", "Isabella", "Isaiah", "Ivan", "Jacinta",
    "Jackson", "Jada", "Jamal", "Jasmine", "Javier", "Jeremiah", "Jessica", "Jian",
    "Joaquin", "Jonah", "Jordan", "Josephine", "Joshua", "Julia", "Julian", "Kai",
    "Kamala", "Kareem", "Katarina", "Katherine", "Keisha", "Kenji", "Kevin",
    "Khalil", "Kiara", "Kwame", "Lakshmi", "Lars", "Laurel", "Leila", "Leo",
    "Leticia", "Levi", "Liam", "Lila", "Lorenzo", "Lucia", "Lucas", "Luis",
    "Mackenzie", "Maddox", "Magdalena", "Malik", "Marcus", "Margaret", "Maria",
    "Mariam", "Mateo", "Maya", "Mei", "Micah", "Michael", "Miguel", "Mila",
    "Miranda", "Miriam", "Mohammed", "Naomi", "Natalia", "Nathaniel", "Nia",
    "Nicholas", "Nina", "Noah", "Nora", "Nyla", "Octavia", "Olivia", "Omar",
    "Oscar", "Owen", "Pablo", "Paloma", "Patrick", "Pedro", "Penelope", "Phoenix",
    "Priya", "Quentin", "Rachel", "Rafael", "Rahul", "Ramona", "Raven", "Rebecca",
    "Reginald", "Renata", "Ricardo", "River", "Rosa", "Ruben", "Ruth", "Ryan",
    "Sadie", "Salma", "Samuel", "Santiago", "Sarah", "Sasha", "Sebastian",
    "Selena", "Seth", "Shane", "Shreya", "Sienna", "Simone", "Sofia", "Solomon",
    "Sophia", "Stella", "Sydney", "Tamara", "Tanvi", "Tessa", "Theo", "Thomas",
    "Tobias", "Trevor", "Tyler", "Uma", "Valeria", "Vanessa", "Vera", "Victor",
    "Vincent", "Violet", "Wesley", "Willa", "William", "Ximena", "Yara", "Yosef",
    "Yuki", "Zachary", "Zainab", "Zara", "Zoe", "Zuri",
]

LAST_NAMES = [
    "Abbott", "Acosta", "Adeyemi", "Aguilar", "Ahmed", "Alvarez", "Andersen",
    "Ansari", "Arroyo", "Ashford", "Bagley", "Baldwin", "Banerjee", "Barnes",
    "Bautista", "Beckett", "Bello", "Bennett", "Bianchi", "Blackwell", "Boateng",
    "Bonilla", "Bradshaw", "Brennan", "Brooks", "Bui", "Burgess", "Cabrera",
    "Calderon", "Callahan", "Camacho", "Cardenas", "Carrington", "Castellanos",
    "Chandler", "Chaudhry", "Chavez", "Chen", "Cho", "Choudhury", "Clarkson",
    "Coleman", "Contreras", "Cortez", "Crawford", "Cruz", "Dalton", "Daniels",
    "Delacroix", "Delgado", "Diallo", "Dixon", "Dominguez", "Donnelly", "Duarte",
    "Dubois", "Eastman", "Ebersole", "Ellison", "Escobar", "Esposito", "Everett",
    "Fairchild", "Faulkner", "Fernandez", "Fitzgerald", "Fleming", "Fontaine",
    "Fowler", "Franco", "Gallagher", "Garcia", "Gardner", "Ghosh", "Gibson",
    "Giordano", "Gomez", "Gonzalez", "Grantham", "Greenwood", "Gupta", "Gutierrez",
    "Hadley", "Hamilton", "Harrington", "Hassan", "Hawthorne", "Hayashi",
    "Henderson", "Hernandez", "Hoffman", "Holloway", "Huang", "Ibrahim", "Iverson",
    "Jackson", "Jang", "Jenkins", "Jimenez", "Johansson", "Kaminski", "Kapoor",
    "Kaur", "Keller", "Kendrick", "Khalil", "Kim", "Kingsley", "Kowalski",
    "Lafferty", "Lam", "Langley", "Larsen", "Lawson", "Leblanc", "Ledbetter",
    "Lehman", "Leung", "Lindqvist", "Lockhart", "Lombardi", "Lopez", "Mancini",
    "Marchetti", "Marsh", "Martinez", "Mbeki", "McAllister", "McKinney", "Medina",
    "Mehta", "Mendoza", "Merrick", "Miyamoto", "Molina", "Montgomery", "Moreau",
    "Morrison", "Mueller", "Mukherjee", "Nakamura", "Navarro", "Nguyen", "Nkemelu",
    "Nolan", "Novak", "Nunez", "Obi", "Ochoa", "Odom", "Ortega", "Osei",
    "Padilla", "Palmer", "Park", "Patel", "Pemberton", "Perez", "Petrov",
    "Pierce", "Prescott", "Quinn", "Ramirez", "Ramos", "Rasmussen", "Reyes",
    "Richardson", "Rivera", "Rodriguez", "Rojas", "Rosales", "Rowntree", "Ruiz",
    "Salazar", "Sandoval", "Santiago", "Sarkar", "Schneider", "Serrano", "Shah",
    "Sharma", "Shepherd", "Silva", "Sinclair", "Singh", "Solomon", "Soto",
    "Stanton", "Stephens", "Sullivan", "Suzuki", "Sweeney", "Tanaka", "Tate",
    "Thornton", "Tobias", "Torres", "Tran", "Underwood", "Valdez", "Vargas",
    "Vasquez", "Villanueva", "Wallace", "Walsh", "Wang", "Washington", "Webster",
    "Whitfield", "Wilkerson", "Winslow", "Wright", "Xiong", "Yamamoto", "Yates",
    "Yoon", "Zamora", "Zhang", "Zimmerman",
]

STREET_NAMES = [
    "Alderwood", "Birchcrest", "Cedar Hollow", "Dogwood", "Elmridge", "Fairhaven",
    "Glenbrook", "Harvest", "Ironwood", "Juniper", "Kestrel", "Lantern",
    "Meadowlark", "Northfield", "Orchard", "Pinehurst", "Quarry", "Riverstone",
    "Sagebrook", "Thistledown", "Underhill", "Vireo", "Willowbend", "Yarrow",
]

STREET_TYPES = ["Avenue", "Lane", "Road", "Court", "Drive", "Terrace", "Way"]

CITY = "Constellation"
STATE_ABBR = "PA"
